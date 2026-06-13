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

// 전체 내비 href 목록(가장 구체적인 매칭을 가리기 위해 사용).
const ALL_HREFS = [...MAIN_NAV, ...NAV_GROUPS.flatMap((g) => g.children)].map((n) => n.href)

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

// href 가 현재 경로의 활성 메뉴인가.
// 단순 접두사 매칭은 /clinic 이 /clinic/materials 의 접두사라 하위 경로에서도 상위가
// 계속 활성으로 잡힌다. → 더 긴(구체적인) href 가 함께 매칭되면 이 href 는 비활성으로 본다.
export function isActive(pathname: string, href: string) {
  if (!matchesPath(pathname, href)) return false
  return !ALL_HREFS.some(
    (other) => other !== href && other.length > href.length && matchesPath(pathname, other)
  )
}

// 현재 경로에 해당하는 메뉴 라벨(상단바 제목용).
export function currentLabel(pathname: string): string {
  const all = [...MAIN_NAV, ...NAV_GROUPS.flatMap((g) => g.children)]
  const hit = all.find((n) => isActive(pathname, n.href))
  return hit?.label ?? '수학학원 LMS'
}
