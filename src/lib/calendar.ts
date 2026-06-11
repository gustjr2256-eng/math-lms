// 캘린더 도메인 유틸 — 날짜 그리드 생성, 색상 프리셋, 주별 레이아웃 계산.
// 날짜는 모두 'YYYY-MM-DD' 문자열로 다룬다(사전식 비교 = 날짜 비교, TZ 이슈 없음).

export type ScheduleType = 'period' | 'single'

export type Schedule = {
  id: string
  title: string
  type: ScheduleType
  start_date: string
  end_date: string
  color: string
  memo: string | null
  created_by: string | null
  created_at: string
}

// 색상 프리셋. 동적 클래스명은 Tailwind가 제거하므로 전체 클래스를 정적으로 보유.
export const COLORS = {
  rose: {
    label: '로즈',
    swatch: 'bg-rose-500',
    bar: 'bg-rose-500/15 text-rose-800 border-rose-500 dark:bg-rose-500/25 dark:text-rose-200',
    badge: 'bg-rose-500 text-white',
    dot: 'bg-rose-500',
  },
  amber: {
    label: '앰버',
    swatch: 'bg-amber-500',
    bar: 'bg-amber-500/15 text-amber-800 border-amber-500 dark:bg-amber-500/25 dark:text-amber-200',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  emerald: {
    label: '에메랄드',
    swatch: 'bg-emerald-500',
    bar: 'bg-emerald-500/15 text-emerald-800 border-emerald-500 dark:bg-emerald-500/25 dark:text-emerald-200',
    badge: 'bg-emerald-500 text-white',
    dot: 'bg-emerald-500',
  },
  blue: {
    label: '블루',
    swatch: 'bg-blue-500',
    bar: 'bg-blue-500/15 text-blue-800 border-blue-500 dark:bg-blue-500/25 dark:text-blue-200',
    badge: 'bg-blue-500 text-white',
    dot: 'bg-blue-500',
  },
  violet: {
    label: '바이올렛',
    swatch: 'bg-violet-500',
    bar: 'bg-violet-500/15 text-violet-800 border-violet-500 dark:bg-violet-500/25 dark:text-violet-200',
    badge: 'bg-violet-500 text-white',
    dot: 'bg-violet-500',
  },
  slate: {
    label: '슬레이트',
    swatch: 'bg-slate-500',
    bar: 'bg-slate-500/15 text-slate-800 border-slate-500 dark:bg-slate-500/25 dark:text-slate-200',
    badge: 'bg-slate-500 text-white',
    dot: 'bg-slate-500',
  },
} as const

export type ColorKey = keyof typeof COLORS
export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[]
export function colorOf(key: string) {
  return COLORS[(key as ColorKey)] ?? COLORS.blue
}

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 로컬 기준 'YYYY-MM-DD'
export function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayYmd(): string {
  return toYmd(new Date())
}

export type Cell = { ymd: string; day: number; inMonth: boolean }

// 해당 월(0-indexed)의 6주 x 7일 = 42칸 그리드. 앞뒤로 이전/다음 달 날짜를 채운다.
export function monthMatrix(year: number, month: number): Cell[][] {
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay() // 0=일
  const cells: Cell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - startWeekday + i)
    cells.push({ ymd: toYmd(d), day: d.getDate(), inMonth: d.getMonth() === month })
  }
  const weeks: Cell[][] = []
  for (let w = 0; w < 6; w++) weeks.push(cells.slice(w * 7, w * 7 + 7))
  return weeks
}

// 한 주 안에서 기간 일정이 차지하는 칸 범위 + 좌우 연속 여부.
export type Segment = {
  schedule: Schedule
  startCol: number // 0~6
  endCol: number // 0~6
  continuesLeft: boolean // 이전 주에서 이어짐
  continuesRight: boolean // 다음 주로 이어짐
}

// 모든 기간 일정에 '고정 레인(줄)'을 1회 배정한다.
//  - 길이가 아니라 시작일(그다음 등록순)로 정렬 → 긴 일정이 위로 올라가지 않는다.
//  - 전역으로 고정하므로 같은 일정은 주가 바뀌어도 항상 같은 줄(=같은 위치/색) 유지.
export function assignGlobalLanes(periods: Schedule[]): Map<string, number> {
  const sorted = [...periods].sort(
    (a, b) =>
      a.start_date.localeCompare(b.start_date) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id)
  )
  const laneEnds: string[] = [] // 각 레인이 마지막으로 점유한 종료일
  const map = new Map<string, number>()
  for (const p of sorted) {
    // 종료일이 이 일정의 시작일보다 이른(겹치지 않는) 첫 레인 재사용, 없으면 새 레인
    let lane = laneEnds.findIndex((end) => end < p.start_date)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(p.end_date)
    } else {
      laneEnds[lane] = p.end_date
    }
    map.set(p.id, lane)
  }
  return map
}

// 기간(period) 일정들을 한 주 안에서, 전역 고정 레인에 맞춰 배치한다.
export function layoutPeriods(
  week: Cell[],
  periods: Schedule[],
  globalLane: Map<string, number>
): Segment[][] {
  const weekStart = week[0].ymd
  const weekEnd = week[6].ymd

  const segs: Segment[] = []
  for (const ev of periods) {
    if (ev.end_date < weekStart || ev.start_date > weekEnd) continue
    let startCol = 0
    let endCol = 6
    for (let c = 0; c < 7; c++) {
      if (week[c].ymd >= ev.start_date) {
        startCol = c
        break
      }
    }
    for (let c = 6; c >= 0; c--) {
      if (week[c].ymd <= ev.end_date) {
        endCol = c
        break
      }
    }
    segs.push({
      schedule: ev,
      startCol,
      endCol,
      continuesLeft: ev.start_date < weekStart,
      continuesRight: ev.end_date > weekEnd,
    })
  }

  const maxLane = segs.reduce((m, s) => Math.max(m, globalLane.get(s.schedule.id) ?? 0), -1)
  const lanes: Segment[][] = Array.from({ length: maxLane + 1 }, () => [])
  for (const s of segs) lanes[globalLane.get(s.schedule.id) ?? 0].push(s)
  return lanes
}

// 단일(single) 일정을 칸(0~6)별로 묶는다.
export function singlesByCol(week: Cell[], singles: Schedule[]): Schedule[][] {
  const byCol: Schedule[][] = Array.from({ length: 7 }, () => [])
  for (let c = 0; c < 7; c++) {
    for (const ev of singles) {
      if (ev.start_date === week[c].ymd) byCol[c].push(ev)
    }
  }
  return byCol
}
