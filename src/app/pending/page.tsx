import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'

// 승인 대기 / 정지 안내 화면.
// proxy가 status != 'approved' 유저를 이 페이지로 보낸다.
export default async function PendingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('users').select('status, name').eq('id', user.id).single()
    : { data: null }

  const suspended = profile?.status === 'suspended'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-900/40">
          {suspended ? '⛔' : '⏳'}
        </div>
        <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {suspended ? '정지된 계정입니다' : '승인 대기 중입니다'}
        </h1>
        <p className="mb-6 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {suspended ? (
            <>
              계정 이용이 정지되었습니다.
              <br />
              자세한 사항은 원장에게 문의하세요.
            </>
          ) : (
            <>
              {profile?.name ? `${profile.name} 님, ` : ''}가입 신청이 접수되었습니다.
              <br />
              원장이 승인하면 시스템을 이용할 수 있습니다.
            </>
          )}
        </p>
        <div className="flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
