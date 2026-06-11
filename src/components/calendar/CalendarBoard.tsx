'use client'

import { useMemo, useState } from 'react'
import {
  WEEKDAYS,
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
}: {
  schedules: Schedule[]
  currentUserId: string
  isAdmin: boolean
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [modal, setModal] = useState<ModalState>(null)

  const today = todayYmd()
  const weeks = useMemo(() => monthMatrix(year, month), [year, month])

  const periods = useMemo(() => schedules.filter((s) => s.type === 'period'), [schedules])
  const singles = useMemo(() => schedules.filter((s) => s.type === 'single'), [schedules])

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
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => move(-1)} label="이전 달">
            ‹
          </NavBtn>
          <NavBtn onClick={() => move(1)} label="다음 달">
            ›
          </NavBtn>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
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
          const lanes = layoutPeriods(week, periods)
          const byCol = singlesByCol(week, singles)
          const singleRows = byCol.reduce((mx, c) => Math.max(mx, c.length), 0)
          const weekHeight = Math.max(
            MIN_WEEK,
            HEADER + lanes.length * BAR_H + singleRows * BADGE_H + PAD
          )

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

              {/* 오버레이: 기간 막대 + 특정일 배지 (날짜 칸과 동일한 grid-cols-7 공유) */}
              <div
                className="pointer-events-none absolute inset-x-0 flex flex-col gap-[2px]"
                style={{ top: HEADER }}
              >
                {/* 기간 막대 레인 */}
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
                          {seg.continuesRight && (
                            <span className="ml-auto opacity-60">▶</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}

                {/* 특정일 배지 (막대 위에 같은 칸으로 겹쳐 정렬) */}
                {Array.from({ length: singleRows }).map((_, r) => (
                  <div key={`srow-${r}`} className="grid grid-cols-7">
                    {byCol.map((colEvents, ci) => {
                      const ev = colEvents[r]
                      if (!ev) return <span key={ci} />
                      const col = colorOf(ev.color)
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setModal({ mode: 'edit', schedule: ev })
                          }}
                          style={{ gridColumn: `${ci + 1} / ${ci + 2}` }}
                          title={ev.title}
                          className={
                            'pointer-events-auto mx-0.5 flex h-[18px] items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold leading-none text-white ' +
                            col.badge
                          }
                        >
                          <span>✓</span>
                          <span className="truncate">{ev.title}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 등록 / 수정 모달 */}
      {modal?.mode === 'create' && (
        <ScheduleModal mode="create" initialDate={modal.date} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <ScheduleModal
          mode="edit"
          schedule={modal.schedule}
          canManage={canManage(modal.schedule)}
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
