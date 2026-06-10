import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 구글 OAuth 콜백: 인가 코드를 세션으로 교환한 뒤 승인 상태에 따라 리다이렉트.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('status')
    .eq('id', data.user.id)
    .single()

  if (profile?.status === 'approved') {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  return NextResponse.redirect(`${origin}/pending`)
}
