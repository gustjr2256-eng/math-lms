import {
  type Cell,
  type Schedule,
  colorOf,
  layoutPeriods,
  assignGlobalLanes,
  singlesByCol,
  WEEKDAYS,
} from '@/lib/calendar'

// 이번 주 학원 일정(정규) — 가로형 주간 캘린더(읽기 전용).
// 본 캘린더(CalendarBoard)와 동일하게 기간 막대(배경) 위에 특정일 배지를 겹쳐 올린다.
//   · 특정일은 같은 색(부모 기간제) 막대의 레인 위에 정확히 겹침(laneCoveringCol).
//   · 클릭/모달 없는 요약 뷰. 상세 편집은 정규 캘린더에서.
const LANE_STEP = 20 // 막대 한 줄 점유 높이(h-[18px] + gap-[2px])

export function WeeklyCalendar({
  cells,
  periods,
  singles,
  today,
}: {
  cells: Cell[]
  periods: Schedule[]
  singles: Schedule[]
  today: string
}) {
  const lanes = layoutPeriods(cells, periods, assignGlobalLanes(periods))
  const byCol = singlesByCol(cells, singles)
  const singleRows = byCol.reduce((m, c) => Math.max(m, c.length), 0)
  const rows = Math.max(lanes.length, singleRows, 1)
  const overlayH = rows * LANE_STEP + 6

  // 특정 칸을 덮는 기간 막대의 레인(같은 색 우선). 없으면 -1.
  const laneCoveringCol = (ci: number, color: string) => {
    for (let li = 0; li < lanes.length; li++) {
      if (lanes[li].some((seg) => seg.startCol <= ci && ci <= seg.endCol && seg.schedule.color === color))
        return li
    }
    for (let li = 0; li < lanes.length; li++) {
      if (lanes[li].some((seg) => seg.startCol <= ci && ci <= seg.endCol)) return li
    }
    return -1
  }

  return (
    <section className="app-card app-card-hover p-5">
      <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
        이번 주 학원 일정
      </h2>

      {/* 요일 + 날짜 헤더 */}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const isToday = c.ymd === today
          return (
            <div key={c.ymd} className="text-center">
              <div
                className={
                  'font-pretendard text-[11px] ' +
                  (i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-brand/50 dark:text-zinc-400')
                }
              >
                {WEEKDAYS[i]}
              </div>
              <div
                className={
                  'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full font-pretendard text-sm ' +
                  (isToday
                    ? 'bg-brand font-bold text-white dark:bg-gold dark:text-[#0a192f]'
                    : 'text-brand dark:text-zinc-200')
                }
              >
                {c.day}
              </div>
            </div>
          )
        })}
      </div>

      {/* 겹침 영역: 기간 막대(배경) + 특정일 배지(막대 위) */}
      {periods.length === 0 && singles.length === 0 ? (
        <p className="mt-4 font-pretendard text-sm text-brand/40 dark:text-zinc-500">
          이번 주 등록된 일정이 없습니다.
        </p>
      ) : (
        <div className="relative mt-3" style={{ minHeight: overlayH }}>
          {/* 기간 막대 레인 (배경) */}
          <div className="flex flex-col gap-[2px]">
            {lanes.map((lane, li) => (
              <div key={li} className="grid grid-cols-7">
                {lane.map((seg) => {
                  const col = colorOf(seg.schedule.color)
                  return (
                    <div
                      key={seg.schedule.id}
                      style={{ gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}` }}
                      title={seg.schedule.title}
                      className={
                        'mx-0.5 flex h-[18px] items-center gap-1 border-l-2 px-1.5 text-[11px] font-medium leading-none ' +
                        col.bar +
                        ' ' +
                        (seg.continuesLeft ? 'rounded-r-md border-l-0' : 'rounded-md') +
                        (seg.continuesRight ? ' rounded-r-none' : '')
                      }
                    >
                      {seg.continuesLeft && <span className="opacity-60">◀</span>}
                      <span className="truncate">{seg.schedule.title}</span>
                      {seg.continuesRight && <span className="ml-auto opacity-60">▶</span>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* 특정일 배지 (전경) — 덮는 막대 줄 위에 겹쳐 배치 */}
          <div className="absolute inset-0">
            {byCol.map((colEvents, ci) =>
              colEvents.map((ev, r) => {
                const col = colorOf(ev.color)
                const lane = laneCoveringCol(ci, ev.color)
                const baseLane = lane >= 0 ? lane : r
                return (
                  <div
                    key={ev.id}
                    title={ev.title}
                    style={{
                      position: 'absolute',
                      left: `calc(${ci} * (100% / 7) + 3px)`,
                      width: `calc(100% / 7 - 6px)`,
                      top: baseLane * LANE_STEP,
                    }}
                    className={
                      'flex h-[18px] items-center gap-1 rounded-full px-1.5 text-[11px] font-semibold leading-none text-white shadow-sm ring-1 ring-white/50 dark:ring-black/30 ' +
                      col.badge
                    }
                  >
                    <span className="text-[9px]">●</span>
                    <span className="truncate">{ev.title}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </section>
  )
}
