'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 반 대시보드 탭 네비게이션.
export function ClassTabs({ classId }: { classId: string }) {
  const pathname = usePathname()
  const base = `/classes/${classId}`

  const tabs = [
    { href: base, label: '요약', exact: true },
    { href: `${base}/students`, label: '학생' },
    { href: `${base}/attendance`, label: '출석' },
    { href: `${base}/tests`, label: '성적' },
    { href: `${base}/progress`, label: '진도' },
    { href: `${base}/homework`, label: '숙제' },
  ]

  return (
    <nav className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              'relative px-4 py-2.5 text-sm font-medium transition-colors ' +
              (active
                ? 'text-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200')
            }
          >
            {t.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-zinc-900 dark:bg-zinc-50" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
