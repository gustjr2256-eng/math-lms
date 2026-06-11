import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { ClassManager, type ManagedClass } from './_components/ClassManager'
import { StudentAdminTable } from './_components/StudentAdminTable'
import type { AdminStudent } from '@/lib/students'

type ClassQueryRow = {
  id: string
  name: string
  subject: string
  day_of_week: string
  time: string
  teacher_id: string
  teacher: { name: string } | { name: string }[] | null
  students: { count: number }[]
}

function oneTeacherName(t: ClassQueryRow['teacher']): string {
  const one = Array.isArray(t) ? t[0] : t
  return one?.name ?? '미지정'
}

// 원장 전용 [학생 통합 관리].
// 보안: proxy(/admin/* 차단) + requireAdmin(서버) + AdminGuard(클라이언트) 삼중.
export default async function StudentAdminPage() {
  const { supabase, profile } = await requireAdmin()

  const [studentsRes, classesRes, teachersRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, grade, school, gender, status, class_id, student_phone, parent_phone, memo')
      .order('created_at', { ascending: false }),
    supabase
      .from('classes')
      .select(
        'id, name, subject, day_of_week, time, teacher_id, teacher:users!classes_teacher_id_fkey(name), students!students_class_id_fkey(count)'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, name')
      .eq('role', 'teacher')
      .eq('status', 'approved')
      .order('name'),
  ])

  const students = (studentsRes.data ?? []) as AdminStudent[]
  const classRows = (classesRes.data ?? []) as unknown as ClassQueryRow[]
  const teachers = (teachersRes.data ?? []) as { id: string; name: string }[]

  const managedClasses: ManagedClass[] = classRows.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    day_of_week: c.day_of_week,
    time: c.time,
    teacher_id: c.teacher_id,
    teacherName: oneTeacherName(c.teacher),
    studentCount: c.students?.[0]?.count ?? 0,
  }))
  // 학생 반배정 드롭다운용 간단 목록
  const classOptions = managedClasses.map((c) => ({ id: c.id, name: c.name }))

  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">전체 학생</h1>
        <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
          신규·재원·퇴원 학생을 모두 관리합니다. 반 생성·수정·삭제, 학생 상태 변경, 반 배정, 연락처
          편집은 모두 원장 전용이며, 강사 화면에는{' '}
          <strong>본인 담당 반의 재원(ACTIVE) 학생만</strong> 자동 반영됩니다.
        </p>

        {/* 반 관리: 목록 + 생성/수정/삭제 */}
        <section className="mt-6">
          <ClassManager classes={managedClasses} teachers={teachers} />
        </section>

        <section className="mt-10">
          <h2 className="mb-2 font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
            학생 관리
          </h2>
          <StudentAdminTable students={students} classes={classOptions} />
        </section>
      </AdminGuard>
    </AppShell>
  )
}
