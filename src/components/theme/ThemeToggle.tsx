'use client'

import { useTheme } from './ThemeProvider'

// Sun/Moon 테마 토글 버튼.
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle, mounted } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={isDark ? '라이트 모드' : '다크 모드'}
      className={
        className ??
        'flex h-9 w-9 items-center justify-center rounded-lg border border-cream-line text-brand transition-colors hover:bg-brand-tint dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
      }
    >
      {/* mounted 전에는 빈 칸으로 hydration 불일치 방지 */}
      {!mounted ? (
        <span className="h-5 w-5" />
      ) : isDark ? (
        <SunIcon />
      ) : (
        <MoonIcon />
      )}
    </button>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
