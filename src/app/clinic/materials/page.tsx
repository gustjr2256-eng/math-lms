import { requireApproved } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { MaterialsBrowser } from '@/components/materials/MaterialsBrowser'
import type { Material } from '@/lib/materials'

// 클리닉반 전용 자료실. 정규 자료실과 컴포넌트를 공유하고 scope='clinic' 만 다르다.
export default async function ClinicMaterialsPage() {
  const { supabase, user, isAdmin, profile } = await requireApproved()

  const { data } = await supabase
    .from('materials')
    .select(
      'id, title, description, school_level, grade, category, file_path, file_name, file_size, created_by, created_at, uploader:users!materials_created_by_fkey(name)'
    )
    .eq('scope', 'clinic')
    .order('created_at', { ascending: false })

  const materials = (data ?? []) as unknown as Material[]

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">클리닉 자료실</h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
        클리닉반 전용 학습 자료를 등록·관리합니다. 강사진 전용 공간이며 학생에게는 노출되지 않습니다.
      </p>

      <MaterialsBrowser materials={materials} currentUserId={user.id} isAdmin={isAdmin} scope="clinic" />
    </AppShell>
  )
}
