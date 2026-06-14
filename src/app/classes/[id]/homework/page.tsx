import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireApproved } from '@/lib/auth'
import { deleteHomework, reviewSubmission } from '@/app/actions/homework'
import { HomeworkForm } from '@/components/homework/HomeworkForm'
import { ShareLink } from '@/components/homework/ShareLink'
import { NotifyPanel } from '@/components/homework/NotifyPanel'
import { homeworkStatus, STATUS_LABEL, daysUntilDue } from '@/lib/homework'

type HomeworkRow = {
  id: string
  title: string
  start_date: string | null
  due_date: string
  description: string | null
  share_token: string
  homework_submissions: { count: number }[]
}

// 상태별 배지 색
const STATUS_BADGE = {
  scheduled: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  closed: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
} as const

type Submission = {
  id: string
  student_name: string
  image_url: string
  review: '미검토' | '완료' | '미흡'
  submitted_at: string
}

const REVIEW_STYLE: Record<string, string> = {
  미검토: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  완료: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  미흡: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
}

// 강사용 숙제 관리 탭: 숙제 생성 + 공유링크 + 제출 현황/이미지/채점.
export default async function HomeworkTab({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ hw?: string }>
}) {
  const { id } = await params
  const { hw: selectedId } = await searchParams
  const { supabase, permissions } = await requireApproved()

  // 숙제 권한 없으면 반 요약으로 리다이렉트
  if (!permissions.homework) redirect(`/classes/${id}`)

  // 클리닉반은 숙제 기능 비활성 → 직접 접근 시 반 요약으로 리다이렉트
  const { data: clsType } = await supabase
    .from('classes')
    .select('class_type')
    .eq('id', id)
    .maybeSingle()
  if ((clsType as { class_type?: string } | null)?.class_type === 'clinic') {
    redirect(`/classes/${id}`)
  }

  const { data: hwData } = await supabase
    .from('homework')
    .select('id, title, start_date, due_date, description, share_token, homework_submissions(count)')
    .eq('class_id', id)
    .order('due_date', { ascending: false })

  const homeworks = (hwData ?? []) as unknown as HomeworkRow[]
  const selected = homeworks.find((h) => h.id === selectedId) ?? null
  const selStatus = selected ? homeworkStatus(selected.start_date, selected.due_date) : 'open'

  let submissions: Submission[] = []
  let nonSubmitters: { id: string; name: string }[] = []
  if (selected) {
    const [subRes, studentsRes] = await Promise.all([
      supabase
        .from('homework_submissions')
        .select('id, student_id, student_name, image_url, review, submitted_at')
        .eq('homework_id', selected.id)
        .order('submitted_at', { ascending: false }),
      supabase.from('students_view').select('id, name').eq('class_id', id).order('name'),
    ])
    submissions = (subRes.data ?? []) as Submission[]

    // 미제출자 = 반 학생 − 제출한 학생(student_id 우선, 이름으로 보조 매칭)
    const submitted = (subRes.data ?? []) as { student_id: string | null; student_name: string }[]
    const submittedIds = new Set(submitted.map((s) => s.student_id).filter(Boolean))
    const submittedNames = new Set(submitted.map((s) => s.student_name))
    const roster = (studentsRes.data ?? []) as { id: string; name: string }[]
    nonSubmitters = roster.filter(
      (st) => !submittedIds.has(st.id) && !submittedNames.has(st.name)
    )
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">숙제 관리</h2>

      <HomeworkForm classId={id} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 숙제 목록 */}
        <div className="lg:col-span-1">
          <h3 className="mb-2 text-sm font-medium text-zinc-500">숙제 목록</h3>
          {homeworks.length === 0 ? (
            <p className="app-card px-4 py-8 text-center text-sm text-zinc-400">
              생성된 숙제가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {homeworks.map((h) => {
                const active = h.id === selectedId
                const count = h.homework_submissions?.[0]?.count ?? 0
                const status = homeworkStatus(h.start_date, h.due_date)
                const dleft = daysUntilDue(h.due_date)
                return (
                  <li
                    key={h.id}
                    className={
                      'rounded-xl border p-3 ' +
                      (active
                        ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900'
                        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950')
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/classes/${id}/homework?hw=${h.id}`} className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' + STATUS_BADGE[status]}>
                            {status === 'open'
                              ? dleft === 0
                                ? '오늘 종료'
                                : `진행중 D-${dleft}`
                              : STATUS_LABEL[status]}
                          </span>
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {h.title}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {h.start_date ? `${h.start_date} ~ ${h.due_date}` : `~ ${h.due_date}`} · 제출 {count}건
                        </p>
                      </Link>
                      <form action={deleteHomework}>
                        <input type="hidden" name="id" value={h.id} />
                        <input type="hidden" name="class_id" value={id} />
                        <button type="submit" className="text-xs text-red-500 hover:underline">
                          삭제
                        </button>
                      </form>
                    </div>
                    <div className="mt-2">
                      <ShareLink token={h.share_token} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* 제출 현황 */}
        <div className="lg:col-span-2">
          {!selected ? (
            <p className="app-card px-4 py-16 text-center text-sm text-zinc-400">
              왼쪽에서 숙제를 선택하면 제출 현황을 볼 수 있습니다.
            </p>
          ) : (
            <div>
              <h3 className="mb-3 flex flex-wrap items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {selected.title}
                <span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + STATUS_BADGE[selStatus]}>
                  {STATUS_LABEL[selStatus]}
                </span>
                <span className="text-sm font-normal text-zinc-400">
                  {selected.start_date ? `${selected.start_date} ~ ${selected.due_date}` : `~ ${selected.due_date}`} · 제출 {submissions.length}건
                </span>
              </h3>

              {/* 미제출자: 진행중이면 '제출 전 대기', 종료되면 '미제출 확정' */}
              {selStatus !== 'scheduled' && nonSubmitters.length > 0 && (
                <div
                  className={
                    'mb-4 rounded-xl border px-4 py-3 ' +
                    (selStatus === 'closed'
                      ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
                      : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20')
                  }
                >
                  <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    {selStatus === 'closed'
                      ? `미제출 확정 ${nonSubmitters.length}명 (기간 종료)`
                      : `제출 전 대기 ${nonSubmitters.length}명 (기간 진행중)`}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {nonSubmitters.map((st) => (
                      <span
                        key={st.id}
                        className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700"
                      >
                        {st.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {submissions.length === 0 ? (
                <p className="app-card px-4 py-12 text-center text-sm text-zinc-400">
                  아직 제출된 숙제가 없습니다.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="overflow-hidden app-card"
                    >
                      <a href={sub.image_url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sub.image_url}
                          alt={`${sub.student_name} 제출`}
                          className="h-48 w-full bg-zinc-100 object-cover dark:bg-zinc-900"
                        />
                      </a>
                      <div className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {sub.student_name}
                          </p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${REVIEW_STYLE[sub.review]}`}
                          >
                            {sub.review}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <form action={reviewSubmission}>
                            <input type="hidden" name="id" value={sub.id} />
                            <input type="hidden" name="class_id" value={id} />
                            <input type="hidden" name="review" value="완료" />
                            <button
                              type="submit"
                              className="h-8 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white hover:bg-emerald-500"
                            >
                              완료
                            </button>
                          </form>
                          <form action={reviewSubmission}>
                            <input type="hidden" name="id" value={sub.id} />
                            <input type="hidden" name="class_id" value={id} />
                            <input type="hidden" name="review" value="미흡" />
                            <button
                              type="submit"
                              className="h-8 rounded-md border border-red-300 px-2.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40"
                            >
                              미흡
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 문자 발송은 기간이 '종료'되어 미제출자가 확정된 뒤에만 가능 */}
              <div className="mt-6">
                {selStatus === 'closed' ? (
                  <NotifyPanel classId={id} homeworkId={selected.id} nonSubmitters={nonSubmitters} />
                ) : (
                  <p className="app-card px-4 py-6 text-center text-sm text-zinc-400">
                    {selStatus === 'scheduled'
                      ? '제출 기간이 시작되면 진행 상황이 표시됩니다.'
                      : '제출 기간이 진행 중입니다. 종료일이 지나면 미제출자에게 문자를 보낼 수 있습니다.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
