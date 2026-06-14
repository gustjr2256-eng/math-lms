'use client'

import { useActionState, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createClass, updateClass, type ClassFormState } from '@/app/actions/classes'

export type ClassRow = {
  id: string
  name: string
  subject: string
  day_of_week: string
  time: string
  teacher_id: string
}

const inputCls =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 font-pretendard text-sm outline-none focus:border-brand dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'
const labelCls = 'font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400'

// 요일 토글용 순서 + 시간 선택지(09:00~23:00, 30분 단위)
const WEEK = ['월', '화', '수', '목', '금', '토', '일'] as const
const TIME_OPTIONS = (() => {
  const arr: string[] = []
  for (let h = 9; h <= 23; h++) {
    for (const m of ['00', '30']) arr.push(`${String(h).padStart(2, '0')}:${m}`)
  }
  return arr
})()

// "월,수,금" / "월·수·금" 등 → 요일 배열
function parseDays(d?: string): string[] {
  if (!d) return []
  return d
    .split(/[,\s·/]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}
// "19:00~21:00" → ["19:00", "21:00"]
function parseTime(t?: string): [string, string] {
  if (!t) return ['', '']
  const [a, b] = t.split(/[~\-–]/).map((s) => s.trim())
  return [a ?? '', b ?? '']
}

// 반 등록(create) / 수정(edit) 모달 — 원장 전용.
export function ClassFormModal({
  mode,
  cls,
  teachers,
  classType = 'regular',
  onClose,
}: {
  mode: 'create' | 'edit'
  cls?: ClassRow
  teachers: { id: string; name: string }[]
  classType?: 'regular' | 'clinic'
  onClose: () => void
}) {
  const action = mode === 'create' ? createClass : updateClass
  const [state, formAction, pending] = useActionState<ClassFormState, FormData>(action, undefined)
  const typeLabel = classType === 'clinic' ? '클리닉반' : '정규반'

  // 요일 다중 선택 + 시작/종료 시간 선택 상태
  const [days, setDays] = useState<string[]>(parseDays(cls?.day_of_week))
  const initTime = parseTime(cls?.time)
  const [start, setStart] = useState(initTime[0])
  const [end, setEnd] = useState(initTime[1])

  useEffect(() => {
    if (state?.ok) onClose()
  }, [state, onClose])

  const toggleDay = (d: string) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))

  // 제출용 직렬화 값(요일은 항상 월→일 순서로 정렬)
  const daysValue = WEEK.filter((d) => days.includes(d)).join(',')
  const timeValue = start && end ? `${start}~${end}` : ''

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-cream-card p-8 shadow-2xl ring-1 ring-cream-line dark:bg-zinc-950 dark:ring-zinc-800"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-lg text-brand/50 hover:bg-brand-tint hover:text-brand dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            ✕
          </button>

          <h2 className="font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">
            {mode === 'create' ? `새 ${typeLabel} 만들기` : `${typeLabel} 정보 수정`}
          </h2>

          <form action={formAction} className="mt-6 space-y-4">
            {mode === 'edit' && <input type="hidden" name="id" value={cls!.id} />}
            <input type="hidden" name="class_type" value={classType} />
            {/* 선택형 요일/시간 → 기존 스키마(day_of_week, time)로 직렬화 제출 */}
            <input type="hidden" name="day_of_week" value={daysValue} />
            <input type="hidden" name="time" value={timeValue} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>반 이름</label>
                <input name="name" defaultValue={cls?.name} placeholder="예: 중2 심화 A" className={`mt-1 ${inputCls}`} required />
              </div>
              <div>
                <label className={labelCls}>과목</label>
                <input name="subject" defaultValue={cls?.subject} placeholder="예: 수학" className={`mt-1 ${inputCls}`} required />
              </div>
            </div>

            {/* 요일 선택 — 토글 박스 */}
            <div>
              <label className={labelCls}>요일</label>
              <div className="mt-1 grid grid-cols-7 gap-1.5">
                {WEEK.map((d) => {
                  const active = days.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={
                        'h-10 rounded-lg border font-paperozi text-sm font-bold transition-colors ' +
                        (active
                          ? 'border-brand/30 bg-brand-tint text-brand dark:border-gold/40 dark:bg-zinc-800 dark:text-gold'
                          : 'border-cream-line bg-cream text-brand/35 hover:text-brand/60 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-600 dark:hover:text-zinc-400')
                      }
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 시간 선택 — 시작/종료 */}
            <div>
              <label className={labelCls}>시간</label>
              <div className="mt-1 flex items-center gap-2">
                <select
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className={inputCls}
                  aria-label="시작 시간"
                >
                  <option value="" disabled>
                    시작
                  </option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span className="shrink-0 font-pretendard text-sm text-brand/50 dark:text-zinc-500">~</span>
                <select
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className={inputCls}
                  aria-label="종료 시간"
                >
                  <option value="" disabled>
                    종료
                  </option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>담당 강사</label>
              <select name="teacher_id" defaultValue={cls?.teacher_id ?? ''} className={`mt-1 ${inputCls}`} required>
                <option value="" disabled>
                  담당 강사 선택
                </option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {teachers.length === 0 && (
                <p className="mt-1 font-pretendard text-xs text-amber-600">승인된 강사가 없습니다. 먼저 강사 가입을 승인하세요.</p>
              )}
            </div>

            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 font-pretendard text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {state.error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border border-cream-line px-4 font-pretendard text-sm text-brand/70 hover:bg-cream dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={pending}
                className="h-10 rounded-lg bg-brand px-5 font-pretendard text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60 dark:bg-gold dark:text-[#0a192f] dark:hover:bg-gold-strong"
              >
                {pending ? '저장 중…' : mode === 'create' ? '반 생성' : '저장'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
