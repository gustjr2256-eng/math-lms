import { createClient } from '@/lib/supabase/server'
import { resolvePermissions, hasPermission, type PermissionKey } from '@/lib/permissions'

// 서버 액션/서버 컴포넌트에서 재사용하는 권한 헬퍼.

export async function getSessionProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, role, status, permissions')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
}

// 원장(admin·approved) 강제
export async function requireAdmin() {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) throw new Error('인증이 필요합니다.')
  if (profile?.role !== 'admin' || profile?.status !== 'approved') {
    throw new Error('권한이 없습니다.')
  }
  return { supabase, user, profile }
}

// 승인된 사용자(원장 또는 강사) 강제
export async function requireApproved() {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) throw new Error('인증이 필요합니다.')
  if (profile?.status !== 'approved') {
    throw new Error('승인되지 않은 계정입니다.')
  }
  return {
    supabase,
    user,
    profile,
    isAdmin: profile.role === 'admin',
    permissions: resolvePermissions(profile.permissions),
  }
}

// 특정 권한이 필요한 서버 액션 진입부에서 호출. 원장은 항상 통과.
export async function requirePermission(key: PermissionKey) {
  const ctx = await requireApproved()
  if (!hasPermission(ctx.profile, key)) {
    throw new Error('이 작업에 대한 권한이 없습니다.')
  }
  return ctx
}
