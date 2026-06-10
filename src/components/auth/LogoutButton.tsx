import { logout } from '@/app/actions/auth'

// 로그아웃 — 서버 액션을 직접 form action으로 호출.
export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={
          className ??
          'h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
        }
      >
        로그아웃
      </button>
    </form>
  )
}
