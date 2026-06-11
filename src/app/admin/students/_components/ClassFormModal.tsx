'use client'

import { useActionState, useEffect } from 'react'
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
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'
const labelCls = 'text-xs font-medium text-zinc-500 dark:text-zinc-400'

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

  useEffect(() => {
    if (state?.ok) onClose()
  }, [state, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {mode === 'create' ? `새 ${typeLabel} 만들기` : `${typeLabel} 정보 수정`}
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            ✕
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          {mode === 'edit' && <input type="hidden" name="id" value={cls!.id} />}
          <input type="hidden" name="class_type" value={classType} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>반 이름</label>
              <input name="name" defaultValue={cls?.name} placeholder="예: 중2 심화 A" className={`mt-1 ${inputCls}`} required />
            </div>
            <div>
              <label className={labelCls}>과목</label>
              <input name="subject" defaultValue={cls?.subject} placeholder="예: 수학" className={`mt-1 ${inputCls}`} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>요일</label>
              <input name="day_of_week" defaultValue={cls?.day_of_week} placeholder="예: 월,수,금" className={`mt-1 ${inputCls}`} required />
            </div>
            <div>
              <label className={labelCls}>시간</label>
              <input name="time" defaultValue={cls?.time} placeholder="예: 19:00~21:00" className={`mt-1 ${inputCls}`} required />
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
              <p className="mt-1 text-xs text-amber-600">승인된 강사가 없습니다. 먼저 강사 가입을 승인하세요.</p>
            )}
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60 dark:bg-gold dark:text-[#0a192f] dark:hover:bg-gold-strong"
            >
              {pending ? '저장 중…' : mode === 'create' ? '반 생성' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
