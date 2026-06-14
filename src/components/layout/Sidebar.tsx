'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MAIN_NAV, NAV_GROUPS, isActive, type NavItem, type NavGroup } from './nav'
import { LogoutButton } from '@/components/auth/LogoutButton'

// 쫀득한 hover 반응(spring) — 메뉴 항목 공통.
const springHover = { type: 'spring' as const, stiffness: 400, damping: 17 }

export function Sidebar({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const groups = NAV_GROUPS.filter((g) => !g.adminOnly || isAdmin)

  return (
    <div className="flex h-full w-[280px] flex-col bg-cream-deep dark:bg-zinc-950">
      {/* 로고 — 클릭 시 메인('/')으로 이동.
          라이트: r_logo.png / 다크: y_logo.png. drop-shadow + hover/tap 애니메이션으로 입체감. */}
      <Link
        href="/"
        onClick={onNavigate}
        aria-label="홈으로 이동"
        className="group block px-6 pb-6 pt-7"
      >
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/r_logo.png"
            alt="수학학원 LMS"
            className="block h-auto w-full object-contain dark:hidden"
            style={{
              filter:
                'drop-shadow(0 3px 3px rgba(0,0,0,0.28)) drop-shadow(0 9px 16px rgba(0,0,0,0.16))',
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/y_logo.png"
            alt="수학학원 LMS"
            className="hidden h-auto w-full object-contain dark:block"
            style={{
              filter:
                'drop-shadow(0 3px 4px rgba(0,0,0,0.55)) drop-shadow(0 10px 20px rgba(0,0,0,0.4))',
            }}
          />
        </motion.div>
      </Link>

      {/* 로고 ↔ 메뉴 구분 + 간격 */}
      <div className="mx-5 mb-3 border-b border-cream-line/70 dark:border-zinc-800/70" />

      {/* 메뉴 */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {MAIN_NAV.map((it) => (
          <MenuLink key={it.href} item={it} active={isActive(pathname, it.href)} onNavigate={onNavigate} />
        ))}

        {groups.map((g) => (
          <NavAccordion key={g.label} group={g} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* 로그아웃 */}
      <div className="border-t border-cream-line px-3 py-3 dark:border-zinc-800">
        <LogoutButton className="h-9 w-full rounded-lg border border-cream-line bg-white/60 px-3 font-pretendard text-sm font-medium text-brand transition-colors hover:bg-white dark:border-zinc-700 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800" />
      </div>
    </div>
  )
}

// 그룹 아코디언 — 기본 '열림'(open=true). 사용자가 닫기 전까지 하위 메뉴 펼침 유지.
function NavAccordion({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup
  pathname: string
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(true)
  const groupActive = group.children.some((c) => isActive(pathname, c.href))

  return (
    <div className="mt-3 border-t border-cream-line/70 pt-3 dark:border-zinc-800/70">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        transition={springHover}
        className={
          'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-paperozi text-[13px] font-bold tracking-wide transition-colors ' +
          (groupActive
            ? 'text-brand dark:text-gold'
            : 'text-brand/70 hover:bg-brand-tint dark:text-zinc-400 dark:hover:bg-zinc-800')
        }
        aria-expanded={open}
      >
        <group.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
        {group.label}
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={springHover}
          className="ml-auto text-[10px] text-brand/40 dark:text-zinc-500"
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
            {group.children.map((c) => (
              <li key={c.href} className="mt-1">
                <MenuLink item={c} active={isActive(pathname, c.href)} onNavigate={onNavigate} nested />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
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
          (nested ? 'py-2 text-sm' : 'py-2.5 text-[15px]') +
          ' ' +
          (active
            ? 'bg-brand text-white shadow-sm dark:bg-gold dark:text-[#0a192f]'
            : 'text-brand/90 hover:bg-brand-tint dark:text-zinc-300 dark:hover:bg-zinc-800')
        }
      >
        <item.icon
          className={(nested ? 'h-4 w-4' : 'h-[18px] w-[18px]') + ' shrink-0'}
          strokeWidth={2}
        />
        {item.label}
      </motion.div>
    </Link>
  )
}
