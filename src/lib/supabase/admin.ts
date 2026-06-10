import 'server-only'
import { createClient } from '@supabase/supabase-js'

// 서비스롤(Service Role) 클라이언트 — RLS를 우회한다.
// 절대 클라이언트 번들로 새어나가면 안 되므로 'server-only'로 봉인한다.
// 용도: 원장의 강사 '삭제'(auth 유저 제거 → users 행 cascade).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
