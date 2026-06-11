import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { StudentAdminTable } from './_components/StudentAdminTable'
import type { AdminStudent } from '@/lib/students'

// 원장 전용 [학생 통합 관리].
// proxy 가 /admin/* 을 admin 역할에게만 통과시키고, requireAdmin 이 한 번 더 막는다.
export default async function StudentAdminPage() {
  const { supabase, profile } = await requireAdmin()

  // 원장은 base 테이블에서 전체 학생(신규/재원/퇴원)을 실제 전화번호와 함께 본다.
  const [studentsRes, classesRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, grade, status, class_id, student_phone, parent_phone, memo')
      .order('created_at', { ascending: false }),
    supabase.from('classes').select('id, name').order('name'),
  ])

  const students = (studentsRes.data ?? []) as AdminStudent[]
  const classes = (classesRes.data ?? []) as { id: string; name: string }[]

  return (
    <AppShell name={profile?.name} isAdmin>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">전체 학생</h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
        신규·재원·퇴원 학생을 모두 관리합니다. 상태 변경, 반 배정, 연락처 편집은 원장만 가능하며,
        강사 화면에는 <strong>본인 담당 반의 재원(ACTIVE) 학생만</strong> 자동 반영됩니다.
      </p>

      <StudentAdminTable students={students} classes={classes} />
    </AppShell>
  )
}
