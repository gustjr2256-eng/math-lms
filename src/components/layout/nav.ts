// 사이드바/상단바가 공유하는 내비게이션 정의.

export type NavItem = { href: string; label: string; icon: string }
export type NavGroup = { label: string; icon: string; adminOnly?: boolean; children: NavItem[] }

// 상단 flat 메뉴(전 강사·원장)
export const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: '🏠' },
]

// 그룹(아코디언) — 모든 그룹은 사이드바에서 기본 '열림'으로 렌더된다.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: '클래스',
    icon: '📚',
    children: [
      { href: '/classes', label: '정규반 관리', icon: '📘' },
      { href: '/materials', label: '자료실', icon: '📎' },
      { href: '/calendar', label: '정규 캘린더', icon: '🗓️' },
      { href: '/timetable', label: '주간 시간표', icon: '⏰' },
    ],
  },
  {
    label: '클리닉반 관리',
    icon: '🩺',
    children: [
      { href: '/clinic', label: '클리닉반 관리', icon: '🧪' },
      { href: '/clinic/materials', label: '클리닉 자료실', icon: '📐' },
      { href: '/clinic/calendar', label: '클리닉 캘린더', icon: '🗓️' },
    ],
  },
  {
    label: '원장 통합 관리',
    icon: '🛡️',
    adminOnly: true,
    children: [
      { href: '/admin/students', label: '학생 통합 관리', icon: '🎓' },
      { href: '/admin/classes', label: '정규반 관리', icon: '📘' },
      { href: '/admin/clinics', label: '클리닉반 관리', icon: '🧪' },
      { href: '/admin/teachers', label: '강사 관리', icon: '🧑‍🏫' },
      { href: '/admin/announcements', label: '공지 관리', icon: '📢' },
      { href: '/admin/messages', label: '메시지 발송', icon: '✉️' },
      { href: '/admin/settings', label: '학원 설정', icon: '⚙️' },
    ],
  },
]

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

// 현재 경로에 해당하는 메뉴 라벨(상단바 제목용). 더 구체적인(긴) href 우선 매칭.
export function currentLabel(pathname: string): string {
  const all = [...MAIN_NAV, ...NAV_GROUPS.flatMap((g) => g.children)]
  const hit = all
    .filter((n) => isActive(pathname, n.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return hit?.label ?? '수학학원 LMS'
}
