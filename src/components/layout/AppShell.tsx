'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { AnnouncementProvider } from '@/components/announcements/AnnouncementProvider'
import { AnnouncementPopup } from '@/components/announcements/AnnouncementPopup'

// 전 페이지 공통 레이아웃 래퍼(MainLayout).
//  - 데스크탑(md+): 좌측 고정 사이드바(280px) + 상단 헤더 + 메인
//  - 모바일: 헤더 햄버거 → framer-motion 슬라이드 드로어
export function AppShell({
  name,
  isAdmin,
  children,
}: {
  name?: string | null
  isAdmin: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <AnnouncementProvider>
    <div className="min-h-screen bg-cream dark:bg-black">
      {/* 데스크탑 고정 사이드바 (280px) */}
      <aside className="fixed inset-y-0 left-0 hidden w-[280px] border-r border-cream-line dark:border-zinc-800 md:block">
        <Sidebar isAdmin={isAdmin} />
      </aside>

      {/* 모바일 드로어 */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 left-0 shadow-xl"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-brand/70 hover:bg-brand-tint dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
              <Sidebar isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* 우측 영역: 상단 헤더 + 메인 */}
      <div className="md:pl-[280px]">
        <TopBar name={name} isAdmin={isAdmin} onMenuClick={() => setOpen(true)} />
        <main>
          <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">{children}</div>
        </main>
      </div>

      {/* 메인 진입 공지 팝업 */}
      <AnnouncementPopup />
    </div>
    </AnnouncementProvider>
  )
}
