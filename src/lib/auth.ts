import { createClient } from '@/lib/supabase/server'

// 서버 액션/서버 컴포넌트에서 재사용하는 권한 헬퍼.

export async function getSessionProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, role, status')
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
  return { supabase, user, profile, isAdmin: profile.role === 'admin' }
}
