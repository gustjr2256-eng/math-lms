import Link from 'next/link'
import { requireApproved } from '@/lib/auth'
import type { AttStatus } from '@/app/actions/attendance'
import { homeworkStatus, STATUS_LABEL } from '@/lib/homework'
import { DailyManageModal } from './_components/DailyManageModal'

type TestRow = {
  id: string
  title: string
  kind: string
  test_date: string
  full_score: number
  test_scores: { score: number }[]
}

type HomeworkRow = {
  id: string
  title: string
  start_date: string | null
  due_date: string
  homework_submissions: { count: number }[]
}

const HW_BADGE = {
  scheduled: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  closed: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
} as const

type ProgressRow = {
  date: string
  textbook: string
  chapter: string | null
  page_from: number | null
  page_to: number | null
}

const ATT: AttStatus[] = ['출석', '지각', '조퇴', '결석']
const ATT_COLOR: Record<AttStatus, string> = {
  출석: 'text-emerald-600 dark:text-emerald-400',
  지각: 'text-amber-600 dark:text-amber-400',
  조퇴: 'text-sky-600 dark:text-sky-400',
  결석: 'text-red-600 dark:text-red-400',
}

// 반 요약 대시보드: 일일 반 관리 + 학생 명단 + 출석현황 + 일일/주간 시험결과(숫자) + 숙제현황 + 진도.
export default async function ClassOverview({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, permissions } = await requireApproved()

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())

  // 반 종류(클리닉이면 숙제 미사용)
  const { data: clsRow } = await supabase
    .from('classes')
    .select('class_type')
    .eq('id', id)
    .maybeSingle()
  const isClinic = (clsRow as { class_type?: string } | null)?.class_type === 'clinic'

  const [studentsRes, attendanceRes, testsRes, hwRes, progressRes] = await Promise.all([
    supabase.from('students_view').select('id, name, grade').eq('class_id', id).order('name'),
    supabase.from('attendance').select('student_id, status').eq('class_id', id).eq('date', today),
    supabase
      .from('tests')
      .select('id, title, kind, test_date, full_score, test_scores(score)')
      .eq('class_id', id)
      .order('test_date', { ascending: false }),
    isClinic
      ? Promise.resolve({ data: [] as HomeworkRow[] })
      : supabase
          .from('homework')
          .select('id, title, start_date, due_date, homework_submissions(count)')
          .eq('class_id', id)
          .order('due_date', { ascending: false })
          .limit(8),
    supabase
      .from('progress')
      .select('date, textbook, chapter, page_from, page_to')
      .eq('class_id', id)
      .order('date', { ascending: false }),
  ])

  const students = (studentsRes.data ?? []) as { id: string; name: string; grade: string }[]
  const attendance = (attendanceRes.data ?? []) as { student_id: string; status: AttStatus }[]
  const tests = (testsRes.data ?? []) as unknown as TestRow[]
  const homeworks = (hwRes.data ?? []) as unknown as HomeworkRow[]
  const progressList = (progressRes.data ?? []) as ProgressRow[]

  // 출석 현황 + 모달 초기값
  const attInitial: Record<string, AttStatus> = {}
  for (const a of attendance) attInitial[a.student_id] = a.status
  const attCount = (s: AttStatus) => attendance.filter((a) => a.status === s).length
  const checkedCount = attendance.length

  // 시험을 일일/주간으로 분리 + 반평균/응시수 계산
  const summarize = (t: TestRow) => {
    const scores = t.test_scores ?? []
    const taken = scores.length
    const avg = taken > 0 ? scores.reduce((a, s) => a + Number(s.score), 0) / taken : null
    const pct = avg !== null && t.full_score > 0 ? Math.round((avg / Number(t.full_score)) * 100) : null
    return { taken, avg, pct }
  }
  const dailyTests = tests.filter((t) => t.kind === '일일').slice(0, 6)
  const weeklyTests = tests.filter((t) => t.kind === '주간').slice(0, 6)

  const latestProgress = progressList[0]

  return (
    <div className="space-y-6">
      {/* 상단: 일일 반 관리 */}
      <div className="flex items-center justify-between">
        <p className="font-pretendard text-sm text-brand/60 dark:text-zinc-400">{today} 기준</p>
        <DailyManageModal
          classId={id}
          today={today}
          students={students}
          attInitial={attInitial}
          isClinic={isClinic}
          perms={{
            attendance: permissions.attendance,
            progress: permissions.progress,
            homework: permissions.homework,
            scores: permissions.scores,
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 오늘 출석 현황 */}
        <section className="app-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
              오늘 출석 현황
            </h2>
            <Link href={`/classes/${id}/attendance`} className="font-pretendard text-xs text-brand/50 hover:underline dark:text-zinc-400">
              체크하기 →
            </Link>
          </div>
          {checkedCount === 0 ? (
            <p className="mt-6 font-pretendard text-sm text-brand/40 dark:text-zinc-500">
              아직 오늘 출결을 체크하지 않았습니다.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {ATT.map((s) => (
                <div key={s} className="flex flex-col items-center rounded-xl bg-cream py-3 dark:bg-zinc-900">
                  <span className={'font-paperozi text-2xl font-bold ' + ATT_COLOR[s]}>{attCount(s)}</span>
                  <span className="font-pretendard text-xs text-brand/55 dark:text-zinc-400">{s}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 font-pretendard text-xs text-brand/45 dark:text-zinc-500">
            전체 학생 {students.length}명 · 체크 {checkedCount}명
          </p>
        </section>

        {/* 일일/주간 시험 결과 (숫자) */}
        <section className="app-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
              시험 결과 (반 평균)
            </h2>
            <Link href={`/classes/${id}/tests`} className="font-pretendard text-xs text-brand/50 hover:underline dark:text-zinc-400">
              입력하기 →
            </Link>
          </div>

          {dailyTests.length === 0 && weeklyTests.length === 0 ? (
            <p className="mt-6 font-pretendard text-sm text-brand/40 dark:text-zinc-500">
              등록된 시험이 없습니다.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <TestKindBlock label="일일" tests={dailyTests} summarize={summarize} />
              <TestKindBlock label="주간" tests={weeklyTests} summarize={summarize} />
            </div>
          )}
        </section>

        {/* 숙제 현황 (클리닉반 제외) */}
        {!isClinic && (
          <section className="app-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
                숙제 현황
              </h2>
              {permissions.homework && (
                <Link href={`/classes/${id}/homework`} className="font-pretendard text-xs text-brand/50 hover:underline dark:text-zinc-400">
                  관리하기 →
                </Link>
              )}
            </div>
            {homeworks.length === 0 ? (
              <p className="mt-6 font-pretendard text-sm text-brand/40 dark:text-zinc-500">
                등록된 숙제가 없습니다.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-cream-line dark:divide-zinc-800/70">
                {homeworks.map((h) => {
                  const count = h.homework_submissions?.[0]?.count ?? 0
                  const status = homeworkStatus(h.start_date, h.due_date)
                  return (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' + HW_BADGE[status]}>
                            {STATUS_LABEL[status]}
                          </span>
                          <p className="truncate font-pretendard text-sm font-medium text-brand dark:text-zinc-100">
                            {h.title}
                          </p>
                        </div>
                        <p className="font-pretendard text-xs text-brand/45 dark:text-zinc-500">
                          {h.start_date ? `${h.start_date} ~ ${h.due_date}` : `~ ${h.due_date}`}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-tint px-2.5 py-1 font-paperozi text-sm font-bold text-brand dark:bg-zinc-800 dark:text-gold">
                        {count}
                        <span className="font-pretendard text-xs font-normal text-brand/50 dark:text-zinc-400"> / {students.length} 제출</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {/* 현재 진도 */}
        <section className={'app-card p-6 ' + (isClinic ? 'lg:col-span-2' : '')}>
          <div className="flex items-center justify-between">
            <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">현재 진도</h2>
            <Link href={`/classes/${id}/progress`} className="font-pretendard text-xs text-brand/50 hover:underline dark:text-zinc-400">
              기록하기 →
            </Link>
          </div>
          {!latestProgress ? (
            <p className="mt-6 font-pretendard text-sm text-brand/40 dark:text-zinc-500">기록된 진도가 없습니다.</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-pretendard text-sm">
              <div>
                <span className="text-brand/45 dark:text-zinc-500">교재</span>{' '}
                <span className="font-medium text-brand dark:text-zinc-50">{latestProgress.textbook}</span>
              </div>
              {latestProgress.chapter && (
                <div>
                  <span className="text-brand/45 dark:text-zinc-500">단원</span>{' '}
                  <span className="font-medium text-brand dark:text-zinc-50">{latestProgress.chapter}</span>
                </div>
              )}
              <div>
                <span className="text-brand/45 dark:text-zinc-500">페이지</span>{' '}
                <span className="font-medium text-brand dark:text-zinc-50">
                  {latestProgress.page_from ?? '?'}–{latestProgress.page_to ?? '?'}p
                </span>
              </div>
              <div className="font-pretendard text-xs text-brand/45 dark:text-zinc-500">
                최종 {latestProgress.date} · 누적 {progressList.length}회 기록
              </div>
            </div>
          )}
        </section>

        {/* 학생 명단 */}
        <section className="app-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
              학생 명단{' '}
              <span className="font-pretendard text-sm font-normal text-brand/45 dark:text-zinc-500">
                {students.length}명
              </span>
            </h2>
            <Link href={`/classes/${id}/students`} className="font-pretendard text-xs text-brand/50 hover:underline dark:text-zinc-400">
              전체 보기 →
            </Link>
          </div>
          {students.length === 0 ? (
            <p className="mt-6 font-pretendard text-sm text-brand/40 dark:text-zinc-500">
              배정된 학생이 없습니다.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {students.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cream-line bg-cream px-3 py-1.5 font-pretendard text-sm text-brand/85 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200"
                >
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-xs text-brand/45 dark:text-zinc-500">{s.grade}</span>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// 일일/주간 시험 결과를 숫자로 나열하는 블록.
function TestKindBlock({
  label,
  tests,
  summarize,
}: {
  label: string
  tests: TestRow[]
  summarize: (t: TestRow) => { taken: number; avg: number | null; pct: number | null }
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-brand/10 px-2 py-0.5 font-pretendard text-xs font-semibold text-brand dark:bg-zinc-800 dark:text-zinc-300">
          {label}
        </span>
        <span className="font-pretendard text-xs text-brand/40 dark:text-zinc-500">{tests.length}건</span>
      </div>
      {tests.length === 0 ? (
        <p className="font-pretendard text-xs text-brand/35 dark:text-zinc-600">기록 없음</p>
      ) : (
        <ul className="space-y-1.5">
          {tests.map((t) => {
            const { taken, avg, pct } = summarize(t)
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-cream px-3 py-2 dark:bg-zinc-900/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-pretendard text-sm font-medium text-brand dark:text-zinc-100">
                    {t.title}
                  </p>
                  <p className="font-pretendard text-xs text-brand/45 dark:text-zinc-500">
                    {t.test_date} · 응시 {taken}명
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-paperozi text-lg font-bold text-brand dark:text-zinc-50">
                    {avg !== null ? Math.round(avg) : '—'}
                    <span className="font-pretendard text-xs font-normal text-brand/45 dark:text-zinc-500">
                      {' '}/ {Number(t.full_score)}
                    </span>
                  </span>
                  {pct !== null && (
                    <span className="ml-2 font-pretendard text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                      {pct}%
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
