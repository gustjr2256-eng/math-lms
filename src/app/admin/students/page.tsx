import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { StudentAdminTable } from './_components/StudentAdminTable'
import type { AdminStudent } from '@/lib/students'

// 원장 전용 [학생 통합 관리].
// 보안: proxy(/admin/* 차단) + requireAdmin(서버) + AdminGuard(클라이언트) 삼중.
// 반 생성/수정/삭제는 [정규반 관리]·[클리닉반 관리]로 이전됨. 여기선 학생만 관리.
export default async function StudentAdminPage() {
  const { supabase, profile } = await requireAdmin()

  const [studentsRes, classesRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, grade, school, gender, status, class_id, student_phone, parent_phone, memo')
      .order('created_at', { ascending: false }),
    supabase.from('classes').select('id, name').order('name'),
  ])

  const students = (studentsRes.data ?? []) as AdminStudent[]
  // 학생 반배정 드롭다운용 목록(정규·클리닉 모두 배정 가능)
  const classOptions = (classesRes.data ?? []) as { id: string; name: string }[]

  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">전체 학생</h1>
        <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
          신규·재원·퇴원 학생을 모두 관리합니다. 학생 상태 변경, 반 배정, 연락처 편집은 모두 원장
          전용이며, 강사 화면에는 <strong>본인 담당 반의 재원(ACTIVE) 학생만</strong> 자동 반영됩니다.
          반 생성·수정·삭제는 [정규반 관리]·[클리닉반 관리]에서 합니다.
        </p>

        <section className="mt-8">
          <StudentAdminTable students={students} classes={classOptions} />
        </section>
      </AdminGuard>
    </AppShell>
  )
}
