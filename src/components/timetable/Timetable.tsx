import {
  WEEKDAYS_KO,
  assignLanes,
  colorForTeacher,
  type Block,
} from '@/lib/timetable'

const HOUR_PX = 50 // 1시간 높이
const DEFAULT_START = 13
const DEFAULT_END = 23

// 강사별 색상으로 구분되는 읽기 전용 주간 통합 시간표.
export function Timetable({
  blocks,
  colorByTeacher,
}: {
  blocks: Block[]
  colorByTeacher: Record<string, string>
}) {
  // 표시 시간 범위(블록에 맞춰 동적 확장, 기본 13~23시)
  const startHour = blocks.length
    ? Math.min(DEFAULT_START, Math.floor(Math.min(...blocks.map((b) => b.startMin)) / 60))
    : DEFAULT_START
  const endHour = blocks.length
    ? Math.max(DEFAULT_END, Math.ceil(Math.max(...blocks.map((b) => b.endMin)) / 60))
    : DEFAULT_END

  const startMin = startHour * 60
  const totalPx = (endHour - startHour) * HOUR_PX
  // 끝 시간(예: 23:00)까지 라벨이 보이도록 경계 포함
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

  const teacherNames = Object.keys(colorByTeacher)

  return (
    <div className="font-pretendard">
      {/* 강사-색상 범례 */}
      {teacherNames.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {teacherNames.map((t) => (
            <span
              key={t}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ' +
                colorForTeacher(colorByTeacher, t)
              }
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="app-card">
        <div className="min-w-0">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-cream-line dark:border-zinc-800">
            <div />
            {WEEKDAYS_KO.map((d, i) => (
              <div
                key={d}
                className={
                  'py-2.5 text-center text-sm font-semibold ' +
                  (i === 5
                    ? 'text-blue-500'
                    : i === 6
                      ? 'text-rose-500'
                      : 'text-brand dark:text-zinc-200')
                }
              >
                {d}
              </div>
            ))}
          </div>

          {/* 본문: 시간축 + 7요일 (상하 여백으로 첫/끝 시간 라벨이 카드 안에 온전히 들어오게) */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] py-4">
            {/* 시간축 */}
            <div className="relative" style={{ height: totalPx }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-3 -translate-y-1/2 bg-cream-card pr-0.5 text-xs font-medium tabular-nums text-brand/55 dark:bg-zinc-950 dark:text-zinc-400"
                  style={{ top: i * HOUR_PX }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* 요일별 컬럼 */}
            {WEEKDAYS_KO.map((_, dayIdx) => {
              const dayBlocks = blocks.filter((b) => b.day === dayIdx)
              const placed = assignLanes(dayBlocks)
              return (
                <div
                  key={dayIdx}
                  className="relative border-l border-cream-line dark:border-zinc-800"
                  style={{ height: totalPx }}
                >
                  {/* 시간 그리드 라인 */}
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-cream-line/60 dark:border-zinc-800/60"
                      style={{ top: i * HOUR_PX }}
                    />
                  ))}

                  {/* 수업 블록 */}
                  {placed.map(({ block, lane, lanes }) => {
                    const top = ((block.startMin - startMin) / 60) * HOUR_PX
                    const height = ((block.endMin - block.startMin) / 60) * HOUR_PX
                    const widthPct = 100 / lanes
                    return (
                      <div
                        key={block.key}
                        style={{
                          top: top + 2,
                          height: height - 4,
                          left: `calc(${lane * widthPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                        className={
                          'absolute overflow-hidden rounded-lg border px-2 py-1 text-xs leading-snug shadow-sm ' +
                          colorForTeacher(colorByTeacher, block.teacherName)
                        }
                        title={`${block.name} · ${block.subject} · ${block.teacherName} (${fmt(block.startMin)}~${fmt(block.endMin)})`}
                      >
                        <div className="truncate font-bold">{block.name}</div>
                        <div className="truncate text-[11px] opacity-80">{block.teacherName}</div>
                        {height > 52 && (
                          <div className="truncate text-[11px] opacity-70">
                            {fmt(block.startMin)}~{fmt(block.endMin)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function fmt(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
