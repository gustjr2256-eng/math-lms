'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MAIN_NAV, ADMIN_GROUP, isActive, type NavItem } from './nav'
import { LogoutButton } from '@/components/auth/LogoutButton'

// 쫀득한 hover 반응(spring) — 메뉴 항목 공통.
const springHover = { type: 'spring' as const, stiffness: 400, damping: 17 }

export function Sidebar({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  // 현재 경로가 원장 그룹 하위면 펼친 상태로 시작
  const adminActive = ADMIN_GROUP.children.some((c) => isActive(pathname, c.href))
  const [open, setOpen] = useState(adminActive)

  return (
    <div className="flex h-full w-[280px] flex-col bg-cream-deep dark:bg-zinc-950">
      {/* 로고 — 클릭 시 메인('/')으로 이동 */}
      <Link href="/" onClick={onNavigate} className="block px-5 py-5">
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={springHover}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-base font-bold text-white">
            M
          </div>
          <div className="leading-tight">
            <div className="font-paperozi text-base font-bold text-brand dark:text-cream">
              수학학원 LMS
            </div>
            <div className="font-pretendard text-[11px] text-brand/60 dark:text-zinc-400">
              {isAdmin ? '원장' : '강사'} 콘솔
            </div>
          </div>
        </motion.div>
      </Link>

      {/* 메뉴 */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {MAIN_NAV.map((it) => (
          <MenuLink key={it.href} item={it} active={isActive(pathname, it.href)} onNavigate={onNavigate} />
        ))}

        {/* 원장 통합 관리 — 아코디언 그룹 */}
        {isAdmin && (
          <div className="pt-2">
            <motion.button
              type="button"
              onClick={() => setOpen((v) => !v)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              transition={springHover}
              className={
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-pretendard text-sm font-semibold transition-colors ' +
                (adminActive
                  ? 'text-brand dark:text-zinc-100'
                  : 'text-brand/80 hover:bg-brand-tint dark:text-zinc-300 dark:hover:bg-zinc-800')
              }
              aria-expanded={open}
            >
              <span className="text-base">{ADMIN_GROUP.icon}</span>
              {ADMIN_GROUP.label}
              <motion.span
                animate={{ rotate: open ? 90 : 0 }}
                transition={springHover}
                className="ml-auto text-xs text-brand/50 dark:text-zinc-500"
              >
                ▶
              </motion.span>
            </motion.button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="overflow-hidden pl-3"
                >
                  {ADMIN_GROUP.children.map((c) => (
                    <li key={c.href} className="mt-1">
                      <MenuLink
                        item={c}
                        active={isActive(pathname, c.href)}
                        onNavigate={onNavigate}
                        nested
                      />
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>

      {/* 로그아웃 */}
      <div className="border-t border-cream-line px-3 py-3 dark:border-zinc-800">
        <LogoutButton className="h-9 w-full rounded-lg border border-cream-line bg-white/60 px-3 font-pretendard text-sm font-medium text-brand transition-colors hover:bg-white dark:border-zinc-700 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800" />
      </div>
    </div>
  )
}

// 개별 메뉴 링크 — hover 시 spring 으로 쫀득하게 반응, 활성 시 버건디 포인트.
function MenuLink({
  item,
  active,
  onNavigate,
  nested = false,
}: {
  item: NavItem
  active: boolean
  onNavigate?: () => void
  nested?: boolean
}) {
  return (
    <Link href={item.href} onClick={onNavigate}>
      <motion.div
        whileHover={{ x: 6, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={springHover}
        className={
          'flex items-center gap-3 rounded-xl px-3 font-pretendard font-semibold transition-colors ' +
          (nested ? 'py-2 text-[13px]' : 'py-2.5 text-sm') +
          ' ' +
          (active
            ? 'bg-brand text-white shadow-sm'
            : 'text-brand/80 hover:bg-brand-tint dark:text-zinc-300 dark:hover:bg-zinc-800')
        }
      >
        <span className={nested ? 'text-sm' : 'text-base'}>{item.icon}</span>
        {item.label}
      </motion.div>
    </Link>
  )
}
