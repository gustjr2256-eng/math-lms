import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { AnnouncementAutoOpen } from '@/components/announcements/AnnouncementAutoOpen'
import { WeeklyCalendar } from '@/components/dashboard/WeeklyCalendar'
import { EmptyState } from '@/components/layout/EmptyState'
import type { Schedule } from '@/lib/calendar'
import { thisWeekCells, buildClassStats, formatProgress } from '@/lib/dashboard'

type ClassRow = {
  id: string
  name: string
  day_of_week: string
  time: string
  teacher: { name: string } | { name: string }[] | null
}

type ProgressRow = {
  class_id: string
  date: string
  textbook: string
  chapter: string | null
  page_from: number | null
  page_to: number | null
}

function oneTeacher(t: ClassRow['teacher']): string {
  const one = Array.isArray(t) ? t[0] : t
  return one?.name ?? '미지정'
}

// 정보형 대시보드: 정규반 당일 운영 현황(반·담당 + 출석률·진도·결석자) + 이번 주 학원 일정.
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('users').select('name, role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = profile?.role === 'admin'

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
  const cells = thisWeekCells(new Date(`${today}T00:00:00`))
  const weekStart = cells[0].ymd
  const weekEnd = cells[6].ymd

  const { data: classData } = await supabase
    .from('classes')
    .select('id, name, day_of_week, time, teacher:users!classes_teacher_id_fkey(name)')
    .eq('class_type', 'regular')
    .order('name')
  const classes = (classData ?? []) as unknown as ClassRow[]
  const ids = classes.map((c) => c.id)

  const [studentsRes, attRes, progRes, schedRes] = await Promise.all([
    supabase.from('students_view').select('id, name, class_id, status'),
    ids.length
      ? supabase.from('attendance').select('class_id, student_id, status').eq('date', today).in('class_id', ids)
      : Promise.resolve({ data: [] as { class_id: string; student_id: string; status: string }[] }),
    ids.length
      ? supabase
          .from('progress')
          .select('class_id, date, textbook, chapter, page_from, page_to')
          .in('class_id', ids)
          .order('date', { ascending: false })
      : Promise.resolve({ data: [] as ProgressRow[] }),
    // 정규 캘린더 일정만(성적/테스트 제외)
    supabase.from('academy_schedules').select('*').eq('scope', 'regular'),
  ])

  // 학생: ACTIVE 인원수 + 이름맵
  const students = (studentsRes.data ?? []) as { id: string; name: string; class_id: string | null; status: string }[]
  const totals = new Map<string, number>()
  const studentName = new Map<string, string>()
  for (const s of students) {
    studentName.set(s.id, s.name)
    if (s.status === 'ACTIVE' && s.class_id) totals.set(s.class_id, (totals.get(s.class_id) ?? 0) + 1)
  }

  const attendance = (attRes.data ?? []) as { class_id: string; student_id: string; status: string }[]
  const stats = buildClassStats(classes, attendance, totals)
  const statById = new Map(stats.map((s) => [s.id, s]))

  // 반별 결석자 이름
  const absentByClass = new Map<string, string[]>()
  for (const a of attendance) {
    if (a.status !== '결석') continue
    const arr = absentByClass.get(a.class_id) ?? []
    arr.push(studentName.get(a.student_id) ?? '학생')
    absentByClass.set(a.class_id, arr)
  }

  // 반별 최신 진도
  const progress = (progRes.data ?? []) as ProgressRow[]
  const latestByClass = new Map<string, ProgressRow>()
  for (const p of progress) if (!latestByClass.has(p.class_id)) latestByClass.set(p.class_id, p)

  // 행 데이터 조립
  const rows = classes.map((c) => {
    const st = statById.get(c.id)!
    const prog = latestByClass.get(c.id)
    return {
      id: c.id,
      name: c.name,
      teacher: oneTeacher(c.teacher),
      rate: st.rate,
      present: st.present,
      checked: st.checked,
      total: st.total,
      progressText: prog ? formatProgress(prog) : null,
      absentNames: absentByClass.get(c.id) ?? [],
    }
  })

  const allSched = (schedRes.data ?? []) as Schedule[]
  const periods = allSched.filter((s) => s.type === 'period' && s.end_date >= weekStart && s.start_date <= weekEnd)
  const singles = allSched.filter((s) => s.type === 'single' && s.start_date >= weekStart && s.start_date <= weekEnd)

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <AnnouncementAutoOpen />

      <h1 className="font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">
        {profile?.name ?? '사용자'} 님, 오늘의 운영 현황입니다 👋
      </h1>
      <p className="mt-1 font-pretendard text-sm text-brand/60 dark:text-zinc-400">
        {today} · 정규반 {classes.length}개 기준
      </p>

      {/* 1) 정규반 당일 운영 현황 — 반·담당 + 출석률·진도·결석자 한 줄 */}
      <section className="mt-8">
        <h2 className="mb-3 font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
          반별 당일 운영 현황
        </h2>

        {rows.length === 0 ? (
          <EmptyState
            icon="📘"
            title="표시할 정규반이 없습니다"
            description={isAdmin ? '정규반을 먼저 생성하세요.' : '담당하는 정규반이 없습니다.'}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-cream-line bg-cream-card shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-cream-line font-pretendard text-xs uppercase text-brand/50 dark:border-zinc-800 dark:text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">반 · 담당</th>
                  <th className="px-4 py-3 font-medium">출석률</th>
                  <th className="px-4 py-3 font-medium">진도</th>
                  <th className="px-4 py-3 font-medium">결석자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-line dark:divide-zinc-800/70">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    {/* 반 · 담당 */}
                    <td className="px-4 py-3">
                      <div className="font-paperozi text-sm font-semibold text-brand dark:text-zinc-50">
                        {r.name}
                      </div>
                      <div className="mt-0.5 font-pretendard text-xs text-brand/50 dark:text-zinc-400">
                        담당 {r.teacher}
                      </div>
                    </td>

                    {/* 출석률 — 숫자 + 얇은 바 */}
                    <td className="px-4 py-3">
                      {r.rate === null ? (
                        <span className="font-pretendard text-sm text-brand/35 dark:text-zinc-500">미체크</span>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="font-pretendard text-lg font-bold tabular-nums"
                              style={{ color: 'var(--accent)' }}
                            >
                              {r.rate}%
                            </span>
                            <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: 'var(--donut-track)' }}>
                              <div className="h-full rounded-full" style={{ width: `${r.rate}%`, background: 'var(--accent)' }} />
                            </div>
                          </div>
                          <div className="mt-1 font-pretendard text-xs text-brand/45 dark:text-zinc-400">
                            출석 {r.present}/{r.checked} · 재적 {r.total}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 진도 */}
                    <td className="px-4 py-3">
                      {r.progressText ? (
                        <span className="font-pretendard text-sm text-brand/80 dark:text-zinc-200">{r.progressText}</span>
                      ) : (
                        <span className="font-pretendard text-sm text-brand/30 dark:text-zinc-600">—</span>
                      )}
                    </td>

                    {/* 결석자 */}
                    <td className="px-4 py-3">
                      {r.absentNames.length === 0 ? (
                        <span className="font-pretendard text-sm text-brand/30 dark:text-zinc-600">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.absentNames.map((n, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-rose-500/10 px-2 py-0.5 font-pretendard text-xs text-rose-600 dark:text-rose-300"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2) 이번 주 학원 일정 (정규 캘린더, 기간막대 위 특정일 겹침) */}
      <div className="mt-6">
        <WeeklyCalendar cells={cells} periods={periods} singles={singles} today={today} />
      </div>
    </AppShell>
  )
}
