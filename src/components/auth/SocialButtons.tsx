'use client'

import { signInWithGoogle } from '@/app/actions/auth'

// 소셜 로그인 버튼 레이아웃.
// - 구글: signInWithGoogle 서버 액션으로 실제 OAuth 흐름 시작.
// - 네이버: Supabase 기본 미지원 → 이번 단계는 비활성 플레이스홀더("준비 중").
export function SocialButtons() {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative py-1 text-center">
        <span className="bg-white px-3 text-xs text-zinc-400 dark:bg-zinc-950">
          또는 소셜 계정으로
        </span>
        <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <GoogleIcon />
          구글로 계속하기
        </button>
      </form>

      <button
        type="button"
        disabled
        aria-disabled
        title="준비 중입니다"
        className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[#03C75A]/60 text-sm font-medium text-white"
      >
        <span className="font-bold">N</span>
        네이버로 계속하기 (준비 중)
      </button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}
