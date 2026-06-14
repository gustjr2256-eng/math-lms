'use client'

import { useMemo, useState } from 'react'
import {
  WEEKDAYS,
  assignGlobalLanes,
  colorOf,
  layoutPeriods,
  monthMatrix,
  singlesByCol,
  todayYmd,
  type Schedule,
} from '@/lib/calendar'
import { ScheduleModal } from './ScheduleModal'

// 레이아웃 상수 (px)
const HEADER = 26 // 날짜 숫자 영역 높이
const BAR_H = 22 // 기간 막대 한 레인 높이(여백 포함)
const BADGE_H = 22 // 특정일 배지 한 줄 높이
const LANE_STEP = 20 // 막대 한 줄의 실제 점유 높이(h-[18px] + gap-[2px]) — 칩 겹침 정렬용
const PAD = 8
const MIN_WEEK = 104

type ModalState =
  | { mode: 'create'; date: string }
  | { mode: 'edit'; schedule: Schedule }
  | null

export function CalendarBoard({
  schedules,
  currentUserId,
  isAdmin,
  scope = 'regular',
}: {
  schedules: Schedule[]
  currentUserId: string
  isAdmin: boolean
  scope?: 'regular' | 'clinic'
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [modal, setModal] = useState<ModalState>(null)

  const today = todayYmd()
  const weeks = useMemo(() => monthMatrix(year, month), [year, month])

  const periods = useMemo(() => schedules.filter((s) => s.type === 'period'), [schedules])
  const singles = useMemo(() => schedules.filter((s) => s.type === 'single'), [schedules])
  // 기간 일정의 줄(레인)을 전역 고정 → 같은 일정이 주마다 같은 줄/색 유지
  const globalLane = useMemo(() => assignGlobalLanes(periods), [periods])

  const move = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }
  const goToday = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  const canManage = (s: Schedule) => isAdmin || s.created_by === currentUserId

  return (
    <div className="mt-8">
      {/* 월 네비게이션 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {year}년 {month + 1}월
          </h2>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            오늘
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
              setModal({ mode: 'create', date: today.startsWith(prefix) ? today : `${prefix}-01` })
            }}
            className="inline-flex h-9 items-center rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-strong dark:bg-gold dark:text-[#0a192f] dark:hover:bg-gold-strong"
          >
            + 일정 추가
          </button>
          <div className="flex items-center gap-1">
            <NavBtn onClick={() => move(-1)} label="이전 달">
              ‹
            </NavBtn>
            <NavBtn onClick={() => move(1)} label="다음 달">
              ›
            </NavBtn>
          </div>
        </div>
      </div>

      <div className="overflow-hidden app-card">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={
                'py-2 text-center text-xs font-medium ' +
                (i === 0
                  ? 'text-rose-500'
                  : i === 6
                    ? 'text-blue-500'
                    : 'text-zinc-500 dark:text-zinc-400')
              }
            >
              {w}
            </div>
          ))}
        </div>

        {/* 주 단위 렌더 */}
        {weeks.map((week, wi) => {
          const lanes = layoutPeriods(week, periods, globalLane)
          const byCol = singlesByCol(week, singles)
          const singleRows = byCol.reduce((mx, c) => Math.max(mx, c.length), 0)
          // 특정일은 막대 위에 겹쳐 그리므로, 막대 줄 수와 특정일 스택 중 큰 쪽 기준
          const weekHeight = Math.max(
            MIN_WEEK,
            HEADER + Math.max(lanes.length * BAR_H, singleRows * BADGE_H, BAR_H) + PAD
          )
          // 특정 칸(요일)을 덮는 기간 막대의 레인 인덱스(없으면 -1).
          // 특정일은 같은 색을 상속한 '부모 기간제' 막대 위에 올라가야 하므로 같은 색을 우선 매칭한다.
          const laneCoveringCol = (ci: number, color: string) => {
            for (let li = 0; li < lanes.length; li++) {
              if (
                lanes[li].some(
                  (seg) =>
                    seg.startCol <= ci && ci <= seg.endCol && seg.schedule.color === color
                )
              )
                return li
            }
            // 같은 색 막대가 없으면 아무 막대라도 덮는 줄
            for (let li = 0; li < lanes.length; li++) {
              if (lanes[li].some((seg) => seg.startCol <= ci && ci <= seg.endCol)) return li
            }
            return -1
          }

          return (
            <div
              key={wi}
              className="relative border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/70"
            >
              {/* 바닥: 날짜 칸 (클릭 → 일정 추가) */}
              <div className="grid grid-cols-7">
                {week.map((c, ci) => (
                  <button
                    key={c.ymd}
                    type="button"
                    onClick={() => setModal({ mode: 'create', date: c.ymd })}
                    style={{ minHeight: weekHeight }}
                    className={
                      'group flex flex-col items-stretch border-r border-zinc-100 text-left last:border-r-0 dark:border-zinc-800/70 ' +
                      (c.inMonth
                        ? 'bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/50'
                        : 'bg-zinc-50/60 dark:bg-zinc-900/30')
                    }
                  >
                    <span className="flex items-center justify-between px-2 pt-1.5">
                      <span
                        className={
                          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ' +
                          (c.ymd === today
                            ? 'bg-zinc-900 font-semibold text-white dark:bg-white dark:text-zinc-900'
                            : c.inMonth
                              ? ci === 0
                                ? 'text-rose-500'
                                : ci === 6
                                  ? 'text-blue-500'
                                  : 'text-zinc-700 dark:text-zinc-300'
                              : 'text-zinc-300 dark:text-zinc-600')
                        }
                      >
                        {c.day}
                      </span>
                      <span className="text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-600">
                        +
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {/* 오버레이: 기간 막대(배경) + 특정일 칩(막대 위 같은 칸·같은 줄에 겹침) */}
              <div className="pointer-events-none absolute inset-x-0" style={{ top: HEADER }}>
                {/* 기간 막대 레인 (배경) */}
                <div className="flex flex-col gap-[2px]">
                  {lanes.map((lane, li) => (
                    <div key={`lane-${li}`} className="grid grid-cols-7">
                      {lane.map((seg) => {
                        const col = colorOf(seg.schedule.color)
                        return (
                          <button
                            key={seg.schedule.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setModal({ mode: 'edit', schedule: seg.schedule })
                            }}
                            style={{ gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}` }}
                            title={seg.schedule.title}
                            className={
                              'pointer-events-auto mx-0.5 flex h-[18px] items-center gap-1 border-l-2 px-1.5 text-[11px] font-medium leading-none ' +
                              col.bar +
                              ' ' +
                              (seg.continuesLeft ? 'rounded-r-md border-l-0' : 'rounded-md') +
                              (seg.continuesRight ? ' rounded-r-none' : '')
                            }
                          >
                            {seg.continuesLeft && <span className="opacity-60">◀</span>}
                            <span className="truncate">{seg.schedule.title}</span>
                            {seg.continuesRight && <span className="ml-auto opacity-60">▶</span>}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>

                {/* 특정일 칩 (전경) — 그 날짜를 덮는 막대의 줄 위에 정확히 겹쳐 배치 */}
                <div className="absolute inset-0">
                  {byCol.map((colEvents, ci) =>
                    colEvents.map((ev, r) => {
                      const col = colorOf(ev.color)
                      // 같은 색(부모 기간제) 막대 줄 위에 겹침. 막대 없으면 첫 줄.
                      const lane = laneCoveringCol(ci, ev.color)
                      const baseLane = lane >= 0 ? lane : r
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setModal({ mode: 'edit', schedule: ev })
                          }}
                          title={ev.title}
                          style={{
                            position: 'absolute',
                            left: `calc(${ci} * (100% / 7) + 3px)`,
                            width: `calc(100% / 7 - 6px)`,
                            top: baseLane * LANE_STEP,
                          }}
                          className={
                            'pointer-events-auto flex h-[18px] items-center gap-1 rounded-full px-1.5 text-[11px] font-semibold leading-none text-white shadow-sm ring-1 ring-white/50 dark:ring-black/30 ' +
                            col.badge
                          }
                        >
                          <span className="text-[9px]">●</span>
                          <span className="truncate">{ev.title}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 등록 / 수정 모달 */}
      {modal?.mode === 'create' && (
        <ScheduleModal mode="create" initialDate={modal.date} scope={scope} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <ScheduleModal
          mode="edit"
          schedule={modal.schedule}
          scope={scope}
          canManage={canManage(modal.schedule)}
          childEvents={
            modal.schedule.type === 'period'
              ? singles
                  .filter(
                    (s) =>
                      s.start_date >= modal.schedule.start_date &&
                      s.start_date <= modal.schedule.end_date
                  )
                  .sort((a, b) => a.start_date.localeCompare(b.start_date))
              : []
          }
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function NavBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-lg text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  )
}
