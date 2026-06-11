// 통합 주간 시간표 — 강사 색상 매핑 + 수업 시간 파싱 유틸.

export const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일'] as const

// 강사별 고유 색상 팔레트(라이트 + 다크). 강사 수만큼 순환 배정한다.
// 예시 고정 매핑 형태: { '김선생': 'bg-rose-200', '박선생': 'bg-blue-200', ... }
export const TEACHER_PALETTE = [
  'bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-500/25 dark:text-rose-100 dark:border-rose-500/40',
  'bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-500/25 dark:text-blue-100 dark:border-blue-500/40',
  'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-100 dark:border-emerald-500/40',
  'bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-500/25 dark:text-amber-100 dark:border-amber-500/40',
  'bg-violet-200 text-violet-900 border-violet-300 dark:bg-violet-500/25 dark:text-violet-100 dark:border-violet-500/40',
  'bg-cyan-200 text-cyan-900 border-cyan-300 dark:bg-cyan-500/25 dark:text-cyan-100 dark:border-cyan-500/40',
  'bg-orange-200 text-orange-900 border-orange-300 dark:bg-orange-500/25 dark:text-orange-100 dark:border-orange-500/40',
  'bg-lime-200 text-lime-900 border-lime-300 dark:bg-lime-500/25 dark:text-lime-100 dark:border-lime-500/40',
]

const FALLBACK = 'bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:border-zinc-600'

// 강사 이름 목록 → { 이름: 색상클래스 } 매핑 생성(이름 정렬로 안정적 배정)
export function buildTeacherColors(names: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  ;[...new Set(names)].sort().forEach((name, i) => {
    map[name] = TEACHER_PALETTE[i % TEACHER_PALETTE.length]
  })
  return map
}

export function colorForTeacher(map: Record<string, string>, name: string): string {
  return map[name] ?? FALLBACK
}

export type RawClass = {
  id: string
  name: string
  subject: string
  day_of_week: string // 예) '월,수,금'
  time: string // 예) '15:00~17:00'
  teacherName: string
}

export type Block = {
  key: string
  day: number // 0=월 ~ 6=일
  startMin: number // 0~1440
  endMin: number
  name: string
  subject: string
  teacherName: string
}

function toMin(hhmm: string): number | null {
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 24 || min > 59) return null
  return h * 60 + min
}

// classes 행들을 요일별 시간 블록으로 분해한다.
export function parseClassBlocks(classes: RawClass[]): Block[] {
  const blocks: Block[] = []
  for (const c of classes) {
    const [rawStart, rawEnd] = c.time.split(/~|-|–/)
    const startMin = rawStart ? toMin(rawStart) : null
    const endMin = rawEnd ? toMin(rawEnd) : null
    if (startMin === null || endMin === null || endMin <= startMin) continue

    const days = c.day_of_week.split(/[,\s/·]+/).map((d) => d.trim()).filter(Boolean)
    for (const d of days) {
      const day = (WEEKDAYS_KO as readonly string[]).indexOf(d)
      if (day < 0) continue
      blocks.push({
        key: `${c.id}-${day}`,
        day,
        startMin,
        endMin,
        name: c.name,
        subject: c.subject,
        teacherName: c.teacherName,
      })
    }
  }
  return blocks
}

// 같은 요일에서 시간이 겹치는 블록을 나란히 배치하기 위한 레인(열) 배정.
export function assignLanes(dayBlocks: Block[]): { block: Block; lane: number; lanes: number }[] {
  const sorted = [...dayBlocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
  const laneEnds: number[] = []
  const placed = sorted.map((block) => {
    let lane = laneEnds.findIndex((end) => end <= block.startMin)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(block.endMin)
    } else {
      laneEnds[lane] = block.endMin
    }
    return { block, lane }
  })
  const lanes = Math.max(1, laneEnds.length)
  return placed.map((p) => ({ ...p, lanes }))
}
