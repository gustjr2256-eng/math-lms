'use client'

import { usePathname } from 'next/navigation'
import { currentLabel } from './nav'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useAnnouncement } from '@/components/announcements/AnnouncementProvider'

// 상단바: (모바일)햄버거 + 페이지 제목 · 검색창 · 알림 · 다크모드 토글 · 유저 프로필.
// 검색/알림은 골격(UI) 단계로 동작 로직은 비워둔다.
export function TopBar({
  name,
  isAdmin,
  onMenuClick,
}: {
  name?: string | null
  isAdmin: boolean
  onMenuClick: () => void
}) {
  const pathname = usePathname()
  const title = currentLabel(pathname)
  const initial = (name ?? '사').trim().charAt(0)
  const { hasAnnouncement, openForce } = useAnnouncement()

  return (
    <header className="sticky top-0 z-30 border-b border-cream-line bg-cream-card/90 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
      <div className="flex h-20 items-center gap-3 px-4 md:px-8">
        {/* 모바일 햄버거 */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="메뉴 열기"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-line text-lg text-brand md:hidden dark:border-zinc-700 dark:text-zinc-200"
        >
          ☰
        </button>

        {/* 페이지 제목 (제목 폰트 Paperozi) */}
        <h2 className="font-paperozi text-xl font-semibold text-brand dark:text-zinc-50">
          {title}
        </h2>

        {/* 우측: 알림 · 토글 · 프로필 */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={openForce}
            aria-label={hasAnnouncement ? '공지 다시 보기' : '알림'}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-cream-line text-brand transition-colors hover:bg-brand-tint dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <BellIcon />
            {hasAnnouncement && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-cream dark:ring-zinc-950" />
            )}
          </button>

          <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-line text-brand transition-colors hover:bg-brand-tint dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800" />

          {/* 유저 프로필 */}
          <div className="flex items-center gap-2 rounded-xl border border-cream-line bg-cream-card py-1 pl-1 pr-3 dark:border-zinc-700 dark:bg-zinc-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white dark:bg-gold dark:text-[#0a192f]">
              {initial}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block font-pretendard text-xs font-semibold text-brand dark:text-zinc-100">
                {name ?? '사용자'}
              </span>
              <span className="block font-pretendard text-[10px] text-brand/60 dark:text-zinc-400">
                {isAdmin ? '원장' : '강사'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
