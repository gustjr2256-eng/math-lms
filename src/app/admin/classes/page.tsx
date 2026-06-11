import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { ClassManager } from '@/app/admin/students/_components/ClassManager'
import { loadManagedClasses } from './_components/loadManagedClasses'

// 원장 전용 정규반 CRUD 관리. proxy + requireAdmin + AdminGuard 삼중 보호.
export default async function AdminClassesPage() {
  const { profile } = await requireAdmin()
  const { classes, teachers } = await loadManagedClasses('regular')

  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">정규반 관리</h1>
        <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
          정규반을 생성·수정·삭제하고 담당 강사를 지정합니다.
        </p>
        <div className="mt-6">
          <ClassManager classes={classes} teachers={teachers} classType="regular" />
        </div>
      </AdminGuard>
    </AppShell>
  )
}
