'use client'

import { useState } from 'react'

// 숙제 제출 공유 링크 표시 + 복사.
export function ShareLink({ token }: { token: string }) {
  // origin 은 클라이언트에서만 알 수 있으므로 lazy 초기화 (effect 미사용).
  const [url] = useState(() =>
    typeof window === 'undefined' ? `/submit/${token}` : `${window.location.origin}/submit/${token}`
  )
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 권한 없을 때는 무시 (사용자가 직접 선택 복사)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        suppressHydrationWarning
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="h-8 min-w-0 flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      />
      <button
        type="button"
        onClick={copy}
        className="h-8 shrink-0 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {copied ? '복사됨!' : '링크 복사'}
      </button>
    </div>
  )
}
