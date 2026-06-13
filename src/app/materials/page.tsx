import { requireApproved } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { MaterialsBrowser } from '@/components/materials/MaterialsBrowser'
import type { Material } from '@/lib/materials'

// 강사·원장 전용 내부 자료실. proxy가 승인 사용자만 통과시키므로
// 학생(계정 없음)은 구조적으로 도달할 수 없다.
export default async function MaterialsPage() {
  const { supabase, user, isAdmin, profile, permissions } = await requireApproved()

  const { data } = await supabase
    .from('materials')
    .select(
      'id, title, description, school_level, grade, category, file_path, file_name, file_size, created_by, created_at, uploader:users!materials_created_by_fkey(name)'
    )
    .eq('scope', 'regular')
    .order('created_at', { ascending: false })

  const materials = (data ?? []) as unknown as Material[]

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">학습 자료실</h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
        문제지·교재·오답노트를 학년/분류별로 등록하고 관리합니다. 강사진 전용 공간이며 학생에게는
        노출되지 않습니다.
      </p>

      <MaterialsBrowser materials={materials} currentUserId={user.id} isAdmin={isAdmin} scope="regular" canUpload={permissions.materials_upload} />
    </AppShell>
  )
}
