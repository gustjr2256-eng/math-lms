import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Next.js 16: 'middleware'는 deprecated → 'proxy'로 대체.
// 매 요청마다 Supabase 세션을 갱신하고, 가입 상태(status)/권한(role)에 따라
// 라우트 접근을 통제한다.

// 로그인 없이 접근 가능한 경로 (/submit/* 는 비로그인 학생 숙제 제출)
const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/submit']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser()를 호출해 토큰을 갱신한다 (이 호출은 제거하면 안 됨).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // 미인증: public 경로만 허용, 나머지는 /login
  if (!user) {
    if (isPublic) return supabaseResponse
    return redirectTo(request, '/login')
  }

  // 인증됨: 가입 상태/권한 조회 (본인 행은 RLS상 조회 가능)
  const { data: profile } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single()

  const status = profile?.status
  const role = profile?.role

  // 승인 전(대기/정지/프로필 없음): /pending 으로만
  if (status !== 'approved') {
    if (pathname === '/pending' || pathname.startsWith('/auth/callback')) {
      return supabaseResponse
    }
    return redirectTo(request, '/pending')
  }

  // 승인됨인데 인증/대기 화면에 접근 → 대시보드로
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname === '/pending'
  ) {
    return redirectTo(request, '/dashboard')
  }

  // 관리자 전용 영역
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return redirectTo(request, '/dashboard')
  }

  return supabaseResponse
}

function redirectTo(request: NextRequest, path: string) {
  const url = request.nextUrl.clone()
  url.pathname = path
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  // 정적 자산/이미지/파비콘 제외하고 모든 경로에 적용
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
