// 사이드바/상단바가 공유하는 내비게이션 정의.

export type NavItem = { href: string; label: string; icon: string }
export type NavGroup = { label: string; icon: string; children: NavItem[] }

// 공통 메인 메뉴(전 강사·원장)
export const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: '🏠' },
  { href: '/classes', label: '반 관리', icon: '📚' },
  { href: '/materials', label: '자료실', icon: '📎' },
  { href: '/calendar', label: '캘린더', icon: '🗓️' },
  { href: '/timetable', label: '시간표', icon: '⏰' },
]

// 원장 전용 그룹(아코디언)
export const ADMIN_GROUP: NavGroup = {
  label: '원장 통합 관리',
  icon: '🛡️',
  children: [
    { href: '/admin/students', label: '학생 통합 관리', icon: '🎓' },
    { href: '/admin/teachers', label: '강사 관리', icon: '🧑‍🏫' },
    { href: '/admin/announcements', label: '공지 관리', icon: '📢' },
  ],
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

// 현재 경로에 해당하는 메뉴 라벨(상단바 페이지 제목용)
export function currentLabel(pathname: string): string {
  const all = [...MAIN_NAV, ...ADMIN_GROUP.children]
  const hit = all.find((n) => isActive(pathname, n.href))
  return hit?.label ?? '수학학원 LMS'
}
