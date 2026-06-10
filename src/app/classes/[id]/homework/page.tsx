import Link from 'next/link'
import { requireApproved } from '@/lib/auth'
import { deleteHomework, reviewSubmission } from '@/app/actions/homework'
import { HomeworkForm } from '@/components/homework/HomeworkForm'
import { ShareLink } from '@/components/homework/ShareLink'
import { NotifyPanel } from '@/components/homework/NotifyPanel'

type HomeworkRow = {
  id: string
  title: string
  due_date: string
  description: string | null
  share_token: string
  homework_submissions: { count: number }[]
}

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
  const { supabase } = await requireApproved()

  const { data: hwData } = await supabase
    .from('homework')
    .select('id, title, due_date, description, share_token, homework_submissions(count)')
    .eq('class_id', id)
    .order('due_date', { ascending: false })

  const homeworks = (hwData ?? []) as unknown as HomeworkRow[]
  const selected = homeworks.find((h) => h.id === selectedId) ?? null

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
            <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
              생성된 숙제가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {homeworks.map((h) => {
                const active = h.id === selectedId
                const count = h.homework_submissions?.[0]?.count ?? 0
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
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {h.title}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          마감 {h.due_date} · 제출 {count}건
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
            <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-16 text-center text-sm text-zinc-400 dark:border-zinc-700">
              왼쪽에서 숙제를 선택하면 제출 현황을 볼 수 있습니다.
            </p>
          ) : (
            <div>
              <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {selected.title}{' '}
                <span className="text-sm font-normal text-zinc-400">제출 {submissions.length}건</span>
              </h3>

              {submissions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-400 dark:border-zinc-700">
                  아직 제출된 숙제가 없습니다.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
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

              <div className="mt-6">
                <NotifyPanel classId={id} homeworkId={selected.id} nonSubmitters={nonSubmitters} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
