import { requireApproved } from '@/lib/auth'
import { AttendanceBoard } from '@/components/classes/AttendanceBoard'
import type { AttStatus } from '@/app/actions/attendance'

// 출석 관리 탭. ?date= 로 날짜 선택(기본 오늘, KST).
export default async function AttendanceTab({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { id } = await params
  const { date: dateParam } = await searchParams
  const { supabase, permissions } = await requireApproved()

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
  const date = dateParam ?? today

  const [studentsRes, attRes] = await Promise.all([
    supabase
      .from('students_view')
      .select('id, name, grade')
      .eq('class_id', id)
      .order('name'),
    supabase
      .from('attendance')
      .select('student_id, status')
      .eq('class_id', id)
      .eq('date', date),
  ])

  const students = (studentsRes.data ?? []) as { id: string; name: string; grade: string }[]
  const initial: Record<string, AttStatus> = {}
  for (const a of (attRes.data ?? []) as { student_id: string; status: AttStatus }[]) {
    initial[a.student_id] = a.status
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">출석 관리</h2>
      <AttendanceBoard classId={id} date={date} students={students} initial={initial} canEdit={permissions.attendance} />
    </div>
  )
}
