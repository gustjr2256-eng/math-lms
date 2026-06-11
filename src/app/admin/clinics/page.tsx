import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { ClassManager } from '@/app/admin/students/_components/ClassManager'
import { loadManagedClasses } from '../classes/_components/loadManagedClasses'

// 원장 전용 클리닉반 CRUD 관리. 정규반 관리와 코드 공유, class_type='clinic' 만 다름.
export default async function AdminClinicsPage() {
  const { profile } = await requireAdmin()
  const { classes, teachers } = await loadManagedClasses('clinic')

  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">클리닉반 관리</h1>
        <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
          클리닉반을 생성·수정·삭제합니다. 클리닉반은 숙제 기능이 없습니다.
        </p>
        <div className="mt-6">
          <ClassManager classes={classes} teachers={teachers} classType="clinic" />
        </div>
      </AdminGuard>
    </AppShell>
  )
}
