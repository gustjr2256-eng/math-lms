'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PERMISSION_KEYS } from '@/lib/permissions'

// 모든 admin 액션은 서버에서 원장 권한을 재검증한다.
// (proxy 통과 여부와 무관하게 액션 자체를 보호)
async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('인증이 필요합니다.')

  const { data: profile } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' || profile?.status !== 'approved') {
    throw new Error('권한이 없습니다.')
  }
  return { supabase, adminId: user.id }
}

function requireUserId(formData: FormData) {
  const id = formData.get('userId')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')
  return id
}

// 승인: pending/suspended → approved
export async function approveTeacher(formData: FormData) {
  const { supabase, adminId } = await assertAdmin()
  const userId = requireUserId(formData)

  const { error } = await supabase
    .from('users')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: adminId })
    .eq('id', userId)
    .eq('role', 'teacher')
  if (error) throw new Error(error.message)

  revalidatePath('/admin/teachers')
}

// 정지: → suspended
export async function suspendTeacher(formData: FormData) {
  const { supabase } = await assertAdmin()
  const userId = requireUserId(formData)

  const { error } = await supabase
    .from('users')
    .update({ status: 'suspended' })
    .eq('id', userId)
    .eq('role', 'teacher')
  if (error) throw new Error(error.message)

  revalidatePath('/admin/teachers')
}

// 정지 해제: suspended → approved
export async function reactivateTeacher(formData: FormData) {
  const { supabase, adminId } = await assertAdmin()
  const userId = requireUserId(formData)

  const { error } = await supabase
    .from('users')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: adminId })
    .eq('id', userId)
    .eq('role', 'teacher')
  if (error) throw new Error(error.message)

  revalidatePath('/admin/teachers')
}

// 삭제: auth 유저 제거 → users 행 cascade. 서비스롤 필요.
export async function deleteTeacher(formData: FormData) {
  await assertAdmin()
  const userId = requireUserId(formData)

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/teachers')
}

// 강사 권한 저장(원장 전용). 폼의 각 키 체크박스 값을 모아 users.permissions(jsonb) 갱신.
export async function updateTeacherPermissions(formData: FormData) {
  const { supabase } = await assertAdmin()
  const userId = requireUserId(formData)

  const permissions: Record<string, boolean> = {}
  for (const key of PERMISSION_KEYS) {
    permissions[key] = formData.get(key) === 'on'
  }

  const { error } = await supabase
    .from('users')
    .update({ permissions })
    .eq('id', userId)
    .eq('role', 'teacher')
  if (error) throw new Error(error.message)

  revalidatePath('/admin/teachers')
}
