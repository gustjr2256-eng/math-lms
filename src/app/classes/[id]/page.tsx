import Link from 'next/link'
import { requireApproved } from '@/lib/auth'

type TestRow = {
  id: string
  title: string
  kind: string
  test_date: string
  full_score: number
  test_scores: { score: number }[]
}

type ProgressRow = {
  date: string
  textbook: string
  chapter: string | null
  page_from: number | null
  page_to: number | null
}

const ATT = ['출석', '지각', '조퇴', '결석'] as const

// 반 요약 대시보드: 오늘 출석현황 + 최근 성적 그래프 + 현재 진도.
export default async function ClassOverview({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireApproved()

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
    new Date()
  )

  const [studentsRes, attendanceRes, testsRes, progressRes] = await Promise.all([
    supabase.from('students_view').select('id').eq('class_id', id),
    supabase.from('attendance').select('status').eq('class_id', id).eq('date', today),
    supabase
      .from('tests')
      .select('id, title, kind, test_date, full_score, test_scores(score)')
      .eq('class_id', id)
      .order('test_date', { ascending: false })
      .limit(6),
    supabase
      .from('progress')
      .select('date, textbook, chapter, page_from, page_to')
      .eq('class_id', id)
      .order('date', { ascending: false }),
  ])

  const studentCount = studentsRes.data?.length ?? 0
  const attendance = (attendanceRes.data ?? []) as { status: string }[]
  const tests = ((testsRes.data ?? []) as unknown as TestRow[]).slice().reverse()
  const progressList = (progressRes.data ?? []) as ProgressRow[]

  const attCount = (s: string) => attendance.filter((a) => a.status === s).length
  const checkedCount = attendance.length
  const latestProgress = progressList[0]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 오늘 출석 현황 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            오늘 출석 현황
          </h2>
          <Link href={`/classes/${id}/attendance`} className="text-xs text-zinc-500 hover:underline">
            체크하기 →
          </Link>
        </div>
        <p className="mt-1 text-xs text-zinc-400">{today}</p>

        {checkedCount === 0 ? (
          <p className="mt-6 text-sm text-zinc-400">아직 오늘 출결을 체크하지 않았습니다.</p>
        ) : (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {ATT.map((s) => (
              <div
                key={s}
                className="flex flex-col items-center rounded-xl bg-zinc-50 py-3 dark:bg-zinc-900"
              >
                <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {attCount(s)}
                </span>
                <span className="text-xs text-zinc-500">{s}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-400">
          전체 학생 {studentCount}명 · 체크 {checkedCount}명
        </p>
      </section>

      {/* 최근 성적 그래프 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            최근 성적 (반 평균)
          </h2>
          <Link href={`/classes/${id}/tests`} className="text-xs text-zinc-500 hover:underline">
            입력하기 →
          </Link>
        </div>

        {tests.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-400">등록된 시험이 없습니다.</p>
        ) : (
          <div className="mt-4 flex h-40 items-end gap-3">
            {tests.map((t) => {
              const scores = t.test_scores ?? []
              const avg =
                scores.length > 0
                  ? scores.reduce((a, s) => a + Number(s.score), 0) / scores.length
                  : 0
              const pct = t.full_score > 0 ? Math.round((avg / Number(t.full_score)) * 100) : 0
              return (
                <div key={t.id} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {scores.length > 0 ? Math.round(avg) : '—'}
                  </span>
                  <div className="flex h-28 w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-zinc-800 dark:bg-zinc-200"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${t.title} 평균 ${Math.round(avg)}/${t.full_score}`}
                    />
                  </div>
                  <span className="w-full truncate text-center text-[10px] text-zinc-400">
                    {t.title}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 현재 진도 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">현재 진도</h2>
          <Link href={`/classes/${id}/progress`} className="text-xs text-zinc-500 hover:underline">
            기록하기 →
          </Link>
        </div>

        {!latestProgress ? (
          <p className="mt-6 text-sm text-zinc-400">기록된 진도가 없습니다.</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-zinc-400">교재</span>{' '}
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {latestProgress.textbook}
              </span>
            </div>
            {latestProgress.chapter && (
              <div>
                <span className="text-zinc-400">단원</span>{' '}
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {latestProgress.chapter}
                </span>
              </div>
            )}
            <div>
              <span className="text-zinc-400">페이지</span>{' '}
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {latestProgress.page_from ?? '?'}–{latestProgress.page_to ?? '?'}p
              </span>
            </div>
            <div className="text-xs text-zinc-400">
              최종 {latestProgress.date} · 누적 {progressList.length}회 기록
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
