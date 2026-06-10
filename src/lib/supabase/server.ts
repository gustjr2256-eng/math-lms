import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 서버 컴포넌트 / 서버 액션 / 라우트 핸들러용 Supabase 클라이언트.
// Next.js 16: cookies() 는 async 이므로 await 한다.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // 서버 컴포넌트에서 호출되면 set이 막힐 수 있다(읽기 전용).
          // 세션 갱신은 proxy.ts가 담당하므로 여기서는 조용히 무시한다.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // no-op
          }
        },
      },
    }
  )
}
