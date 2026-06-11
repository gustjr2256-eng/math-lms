import { requireApproved } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { CalendarBoard } from '@/components/calendar/CalendarBoard'
import type { Schedule } from '@/lib/calendar'

// 클리닉 캘린더(scope='clinic'). 정규 캘린더와 컴포넌트를 공유하고 scope 만 다르다.
export default async function ClinicCalendarPage() {
  const { supabase, user, isAdmin, profile } = await requireApproved()

  const { data } = await supabase
    .from('academy_schedules')
    .select('id, title, type, start_date, end_date, color, memo, created_by, created_at, scope')
    .eq('scope', 'clinic')
    .order('start_date', { ascending: true })

  const schedules = (data ?? []) as Schedule[]

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">클리닉 캘린더</h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
        클리닉반 전용 일정입니다. <strong>기간 일정</strong>은 배경 막대로, <strong>특정일</strong>은
        그 위에 배지로 겹쳐 표시됩니다. 날짜 칸을 클릭해 일정을 추가하세요.
      </p>

      <CalendarBoard schedules={schedules} currentUserId={user.id} isAdmin={isAdmin} scope="clinic" />
    </AppShell>
  )
}
