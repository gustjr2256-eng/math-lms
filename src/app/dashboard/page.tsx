import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'

// 로그인 후 랜딩. proxy가 approved 유저만 통과시킨다.
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('users').select('name, role').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">수학학원 LMS</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {isAdmin ? '원장' : '강사'}
          </span>
        </div>
        <LogoutButton />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {profile?.name ?? '사용자'} 님, 환영합니다 👋
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          승인된 계정으로 로그인했습니다.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">반 관리</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {isAdmin
              ? '반을 만들고 담당 강사를 지정하며, 반별 학생 명단을 관리합니다.'
              : '담당하는 반의 학생 명단을 관리합니다.'}
          </p>
          <Link
            href="/classes"
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            반 관리로 이동 →
          </Link>
        </div>

        {isAdmin && (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              원장 관리
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              강사 가입 승인 및 계정 상태를 관리합니다.
            </p>
            <Link
              href="/admin/teachers"
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              강사 가입 승인·관리 →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
