'use client'

import { useFormStatus } from 'react-dom'

// form action 제출 중 비활성/로딩 표시를 처리하는 버튼.
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      {pending ? '처리 중…' : children}
    </button>
  )
}
