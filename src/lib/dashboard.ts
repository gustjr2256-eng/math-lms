// 대시보드 집계 — 순수 함수(테스트/재사용 용이). page가 실 DB 데이터를 주입한다.
//
// [Mock Data 예시]
//   classes:    [{ id:'c1', name:'기하반', day_of_week:'월,수,금', time:'19:00~21:00' }]
//   attendance: [{ class_id:'c1', student_id:'s1', status:'출석' }, { class_id:'c1', student_id:'s2', status:'결석' }]
//   totals:     Map([['c1', 12]])              // 반별 ACTIVE 학생 수
//   studentName:Map([['s2','김결석']])
//   progress:   [{ class_id:'c1', date:'2026-06-12', textbook:'쎈', chapter:'3단원', page_from:20, page_to:28 }]
//   → buildClassStats → [{ id:'c1', name:'기하반', total:12, checked:2, present:1, absent:1, rate:50 }]

import { type Cell, toYmd } from './calendar'

// ── 이번 주(일~토) 7칸 ──────────────────────────────────────────
export function thisWeekCells(base = new Date()): Cell[] {
  const start = new Date(base)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay()) // 일요일로 back
  const cells: Cell[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({ ymd: toYmd(d), day: d.getDate(), inMonth: true })
  }
  return cells
}

// ── 반별 당일 출석 통계 ─────────────────────────────────────────
export type ClassStat = {
  id: string
  name: string
  total: number // ACTIVE 학생 수
  checked: number // 출결 체크된 수
  present: number // 출석+지각+조퇴
  absent: number // 결석
  rate: number | null // 출석률 0~100, null = 미체크
}

export function buildClassStats(
  classes: { id: string; name: string }[],
  attendance: { class_id: string; status: string }[],
  totals: Map<string, number>
): ClassStat[] {
  return classes.map((c) => {
    const rows = attendance.filter((a) => a.class_id === c.id)
    const checked = rows.length
    const absent = rows.filter((a) => a.status === '결석').length
    const present = rows.filter(
      (a) => a.status === '출석' || a.status === '지각' || a.status === '조퇴'
    ).length
    const rate = checked > 0 ? Math.round((present / checked) * 100) : null
    return { id: c.id, name: c.name, total: totals.get(c.id) ?? 0, checked, present, absent, rate }
  })
}

// ── 오늘 결석자 명단 ────────────────────────────────────────────
export type Absentee = { name: string; className: string }

export function buildAbsentees(
  classes: { id: string; name: string }[],
  attendance: { class_id: string; student_id: string; status: string }[],
  studentName: Map<string, string>
): Absentee[] {
  const classNameById = new Map(classes.map((c) => [c.id, c.name]))
  return attendance
    .filter((a) => a.status === '결석')
    .map((a) => ({
      name: studentName.get(a.student_id) ?? '학생',
      className: classNameById.get(a.class_id) ?? '',
    }))
}

// ── 진도 요약 텍스트 ────────────────────────────────────────────
export function formatProgress(p: {
  textbook: string
  chapter: string | null
  page_from: number | null
  page_to: number | null
}): string {
  const parts: string[] = [p.textbook]
  if (p.chapter) parts.push(p.chapter)
  if (p.page_from != null || p.page_to != null) {
    parts.push(`${p.page_from ?? '?'}–${p.page_to ?? '?'}p`)
  }
  return parts.join(' ')
}

// ── 정규 수업(요일 파생) — 주간 캘린더 칸별 ────────────────────
const DOW_INDEX: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 }

export type SessionChip = { name: string; time: string }

export function weeklyClassSessions(
  classes: { name: string; day_of_week: string; time: string }[]
): SessionChip[][] {
  const byCol: SessionChip[][] = Array.from({ length: 7 }, () => [])
  for (const c of classes) {
    const days = (c.day_of_week ?? '').split(/[,\s/]+/).filter(Boolean)
    for (const d of days) {
      const idx = DOW_INDEX[d.trim()]
      if (idx !== undefined) byCol[idx].push({ name: c.name, time: c.time })
    }
  }
  return byCol
}
