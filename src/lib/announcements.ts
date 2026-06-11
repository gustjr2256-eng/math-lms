// 공지 공유 타입 + '오늘 보지 않기' localStorage 헬퍼.

export type Announcement = {
  id: string
  title: string
  body: string
  image_url: string | null
  active: boolean
  created_at: string
  // 0010 — 반 타겟팅 + 서식 본문(HTML). 미적용 환경에선 undefined.
  target?: 'all' | 'class'
  class_id?: string | null
  body_html?: string | null
}

const DISMISS_KEY = 'announcement-dismissed'

// 로컬 날짜(YYYY-MM-DD)
function todayStr(): string {
  return new Date().toLocaleDateString('en-CA')
}

// 이 공지를 '오늘' 더 이상 보지 않기로 했는지
export function isDismissedToday(id: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { id: string; date: string }
    return parsed.id === id && parsed.date === todayStr()
  } catch {
    return false
  }
}

// 오늘 하루 이 공지 숨기기
export function dismissForToday(id: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ id, date: todayStr() }))
  } catch {
    /* 무시 */
  }
}
