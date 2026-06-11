import { requireApproved } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { CalendarBoard } from '@/components/calendar/CalendarBoard'
import type { Schedule } from '@/lib/calendar'

// 학원 캘린더. proxy가 승인 사용자만 통과시키므로 강사·원장 전용이다.
export default async function CalendarPage() {
  const { supabase, user, isAdmin, profile } = await requireApproved()

  // 학원 일정은 양이 많지 않아 전체를 받아 클라이언트에서 월 이동/필터링한다.
  const { data } = await supabase
    .from('academy_schedules')
    .select('id, title, type, start_date, end_date, color, memo, created_by, created_at')
    .order('start_date', { ascending: true })

  const schedules = (data ?? []) as Schedule[]

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">월간 일정</h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
        내신 대비·방학 같은 <strong>기간 일정</strong>은 배경 막대로, 시험·보강 같은{' '}
        <strong>특정일 일정</strong>은 그 위에 배지로 겹쳐 표시됩니다. 날짜 칸을 클릭해 일정을
        추가하세요.
      </p>

      <CalendarBoard schedules={schedules} currentUserId={user.id} isAdmin={isAdmin} />
    </AppShell>
  )
}
