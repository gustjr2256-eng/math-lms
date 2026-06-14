// 숙제 '제출 기간' 판정 공용 헬퍼 — 서버/클라이언트 공용 순수 함수.
// 단일 마감일이 아니라 [start_date ~ due_date] 기간으로 운영한다.
//   · 오늘 < start_date            → 'scheduled'(시작 전·예정)
//   · start_date ≤ 오늘 ≤ due_date → 'open'(진행중, 미제출 = 제출 전 대기)
//   · 오늘 > due_date              → 'closed'(종료, 미제출 = 미제출자 → 문자 발송 대상)

export type HomeworkStatus = 'scheduled' | 'open' | 'closed'

// KST 기준 오늘 날짜(YYYY-MM-DD)
export function kstToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}

// 제출 기간 상태
export function homeworkStatus(startDate: string | null, dueDate: string): HomeworkStatus {
  const today = kstToday()
  if (startDate && today < startDate) return 'scheduled'
  if (dueDate && today > dueDate) return 'closed'
  return 'open'
}

// 제출 가능 여부(진행중일 때만)
export function canSubmit(startDate: string | null, dueDate: string): boolean {
  return homeworkStatus(startDate, dueDate) === 'open'
}

// 종료(마감) 여부 — 미제출자가 '확정'되는 시점
export function isClosed(startDate: string | null, dueDate: string): boolean {
  return homeworkStatus(startDate, dueDate) === 'closed'
}

// 상태 한글 라벨
export const STATUS_LABEL: Record<HomeworkStatus, string> = {
  scheduled: '시작 전',
  open: '진행중',
  closed: '종료',
}

// 마감까지 남은 일수(음수면 지난 일수). 0이면 오늘이 종료일.
export function daysUntilDue(dueDate: string): number {
  if (!dueDate) return 0
  const today = new Date(`${kstToday()}T00:00:00`)
  const due = new Date(`${dueDate}T00:00:00`)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}
