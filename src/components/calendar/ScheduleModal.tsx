'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import {
  COLORS,
  COLOR_KEYS,
  type ColorKey,
  type Schedule,
  type ScheduleType,
} from '@/lib/calendar'
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  type ScheduleFormState,
} from '@/app/actions/schedules'

const inputCls =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'
const labelCls = 'text-xs font-medium text-zinc-500 dark:text-zinc-400'

type Props =
  | { mode: 'create'; initialDate: string; onClose: () => void }
  | {
      mode: 'edit'
      schedule: Schedule
      canManage: boolean
      childEvents?: Schedule[]
      onClose: () => void
    }

export function ScheduleModal(props: Props) {
  const isEdit = props.mode === 'edit'
  const sch = isEdit ? props.schedule : null
  const action = isEdit ? updateSchedule : createSchedule

  const [state, formAction, pending] = useActionState<ScheduleFormState, FormData>(
    action,
    undefined
  )

  const [type, setType] = useState<ScheduleType>(sch?.type ?? 'single')
  const [color, setColor] = useState<ColorKey>((sch?.color as ColorKey) ?? 'blue')
  const [start, setStart] = useState(
    sch?.start_date ?? (props.mode === 'create' ? props.initialDate : '')
  )
  const [end, setEnd] = useState(sch?.end_date ?? '')

  // 기간제 생성/수정 시 함께 추가하는 '기간 내 특정일'들(아직 저장 전)
  const [events, setEvents] = useState<{ date: string; title: string }[]>([])
  const addEvent = () => setEvents((p) => [...p, { date: start, title: '' }])
  const updateEvent = (i: number, key: 'date' | 'title', val: string) =>
    setEvents((p) => p.map((e, idx) => (idx === i ? { ...e, [key]: val } : e)))
  const removeEvent = (i: number) => setEvents((p) => p.filter((_, idx) => idx !== i))

  // 수정 모드: 이미 이 기간에 등록돼 있는 특정일들(삭제 가능)
  const [existing, setExisting] = useState<Schedule[]>(
    isEdit ? props.childEvents ?? [] : []
  )
  const [removing, startRemoving] = useTransition()
  const removeExisting = (id: string) => {
    const fd = new FormData()
    fd.set('id', id)
    startRemoving(async () => {
      await deleteSchedule(fd)
      setExisting((p) => p.filter((e) => e.id !== id))
    })
  }

  const readOnly = isEdit && !props.canManage
  // 기간제이면 생성/수정 모두에서 '기간 내 특정일'을 추가할 수 있다(읽기 전용 제외).
  const showEvents = type === 'period' && !readOnly

  useEffect(() => {
    if (state?.ok) props.onClose()
  }, [state, props])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {isEdit ? (readOnly ? '일정 보기' : '일정 수정') : '새 일정 등록'}
          </h2>
          <button
            type="button"
            onClick={props.onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          {isEdit && <input type="hidden" name="id" value={sch!.id} />}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="color" value={color} />

          {/* 유형 선택 */}
          <div>
            <label className={labelCls}>유형</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <TypeOption
                active={type === 'single'}
                disabled={readOnly}
                onClick={() => setType('single')}
                title="특정일"
                desc="시험·보강 등 하루"
              />
              <TypeOption
                active={type === 'period'}
                disabled={readOnly}
                onClick={() => setType('period')}
                title="기간제"
                desc="내신대비·방학 등"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>제목</label>
            <input
              name="title"
              defaultValue={sch?.title}
              placeholder={type === 'period' ? '예: 1학기 기말고사 대비' : '예: 수학 시험일'}
              className={`mt-1 ${inputCls}`}
              readOnly={readOnly}
              required
            />
          </div>

          {/* 날짜: 단일은 시작일만, 기간제는 시작~종료 */}
          <div className={'grid gap-3 ' + (type === 'period' ? 'grid-cols-2' : 'grid-cols-1')}>
            <div>
              <label className={labelCls}>{type === 'period' ? '시작일' : '날짜'}</label>
              <input
                name="start_date"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={`mt-1 ${inputCls}`}
                readOnly={readOnly}
                required
              />
            </div>
            {type === 'period' && (
              <div>
                <label className={labelCls}>종료일</label>
                <input
                  name="end_date"
                  type="date"
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  readOnly={readOnly}
                  required
                />
              </div>
            )}
          </div>

          {/* 색상 */}
          <div>
            <label className={labelCls}>색상</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COLOR_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setColor(k)}
                  aria-label={COLORS[k].label}
                  className={
                    'h-7 w-7 rounded-full ' +
                    COLORS[k].swatch +
                    ' transition ' +
                    (color === k
                      ? 'ring-2 ring-zinc-900 ring-offset-2 dark:ring-white dark:ring-offset-zinc-950'
                      : 'opacity-70 hover:opacity-100')
                  }
                />
              ))}
            </div>
          </div>

          {/* 기간제 생성 시: 기간 내 특정일(시험·보강 등)을 함께 추가 → 기간 막대 위에 겹쳐 표시 */}
          {showEvents && (
            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className={labelCls}>
                  {isEdit ? '기간 내 특정일' : '기간 내 특정일 (선택)'}
                </label>
                <button
                  type="button"
                  onClick={addEvent}
                  disabled={!start}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  + 특정일 추가
                </button>
              </div>

              {/* 수정 모드: 이미 등록된 특정일 목록 + 삭제 */}
              {isEdit && existing.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {existing.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs dark:bg-zinc-900"
                    >
                      <span className="text-zinc-400 tabular-nums">{ev.start_date.slice(5)}</span>
                      <span className="flex-1 truncate font-medium text-zinc-700 dark:text-zinc-200">
                        {ev.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExisting(ev.id)}
                        disabled={removing}
                        className="rounded px-1.5 py-0.5 text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {events.length === 0 ? (
                <p className="mt-2 text-[11px] text-zinc-400">
                  {isEdit
                    ? '이 기간에 시험·보강 등 특정일을 추가합니다. 추가한 항목은 새 일정으로 생성되며, 기존 특정일의 수정·삭제는 캘린더에서 해당 배지를 클릭하세요.'
                    : '예: 기말고사 대비 기간 안에 ‘수학 시험일’ 같은 특정일을 더하면, 기간 막대 위에 배지로 겹쳐 표시됩니다.'}
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {events.map((ev, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="date"
                        value={ev.date}
                        min={start || undefined}
                        max={end || undefined}
                        onChange={(e) => updateEvent(i, 'date', e.target.value)}
                        className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
                      />
                      <input
                        value={ev.title}
                        placeholder="예: 수학 시험"
                        onChange={(e) => updateEvent(i, 'title', e.target.value)}
                        className="h-9 flex-1 rounded-lg border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => removeEvent(i)}
                        aria-label="삭제"
                        className="flex h-9 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 서버로 전달: 유효한 항목만 JSON */}
              <input
                type="hidden"
                name="events"
                value={JSON.stringify(events.filter((e) => e.date && e.title.trim()))}
              />
            </div>
          )}

          <div>
            <label className={labelCls}>메모 (선택)</label>
            <textarea
              name="memo"
              defaultValue={sch?.memo ?? ''}
              rows={2}
              readOnly={readOnly}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
            />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {state.error}
            </p>
          )}

          {!readOnly && (
            <div className="flex items-center justify-between pt-1">
              {isEdit && props.canManage ? (
                <DeleteButton id={sch!.id} onDone={props.onClose} />
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={props.onClose}
                  className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {pending ? '저장 중…' : isEdit ? '저장' : '등록'}
                </button>
              </div>
            </div>
          )}

          {readOnly && (
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              이 일정은 다른 강사가 등록했습니다. 수정·삭제는 작성자 또는 원장만 가능합니다.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

function TypeOption({
  active,
  disabled,
  onClick,
  title,
  desc,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        'rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-60 ' +
        (active
          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-white dark:text-zinc-900'
          : 'border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900')
      }
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span
        className={
          'block text-[11px] ' +
          (active ? 'text-zinc-300 dark:text-zinc-500' : 'text-zinc-400')
        }
      >
        {desc}
      </span>
    </button>
  )
}

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const onClick = () => {
    if (!window.confirm('이 일정을 삭제할까요?')) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await deleteSchedule(fd)
      onDone()
    })
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="h-10 rounded-lg px-3 text-sm font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
    >
      {pending ? '삭제 중…' : '삭제'}
    </button>
  )
}
