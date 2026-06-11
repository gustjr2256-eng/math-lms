'use client'

import { useActionState, useEffect } from 'react'
import {
  STUDENT_STATUSES,
  STATUS_LABEL,
  STUDENT_GENDERS,
  type AdminStudent,
} from '@/lib/students'
import {
  addStudent,
  updateStudent,
  type StudentFormState,
} from '@/app/actions/students'

const inputCls =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'
const labelCls = 'text-xs font-medium text-zinc-500 dark:text-zinc-400'

// 학생 등록(create) / 수정(edit) 모달 — 원장 전용.
export function StudentFormModal({
  mode,
  student,
  classes,
  onClose,
}: {
  mode: 'create' | 'edit'
  student?: AdminStudent
  classes: { id: string; name: string }[]
  onClose: () => void
}) {
  const action = mode === 'create' ? addStudent : updateStudent
  const [state, formAction, pending] = useActionState<StudentFormState, FormData>(
    action,
    undefined
  )

  useEffect(() => {
    if (state?.ok) onClose()
  }, [state, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {mode === 'create' ? '학생 등록' : '학생 정보 수정'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          {mode === 'edit' && <input type="hidden" name="id" value={student!.id} />}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>이름</label>
              <input name="name" defaultValue={student?.name} className={`mt-1 ${inputCls}`} required />
            </div>
            <div>
              <label className={labelCls}>학년</label>
              <input
                name="grade"
                defaultValue={student?.grade}
                placeholder="예: 중2"
                className={`mt-1 ${inputCls}`}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>학교</label>
              <input
                name="school"
                defaultValue={student?.school ?? ''}
                placeholder="예: OO중학교"
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <label className={labelCls}>성별</label>
              <select name="gender" defaultValue={student?.gender ?? ''} className={`mt-1 ${inputCls}`}>
                <option value="">선택 안 함</option>
                {STUDENT_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>상태</label>
              {/* 등록 기본값: 신규(NEW) */}
              <select name="status" defaultValue={student?.status ?? 'NEW'} className={`mt-1 ${inputCls}`}>
                {STUDENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]} ({s})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>반 배정</label>
              <select name="class_id" defaultValue={student?.class_id ?? ''} className={`mt-1 ${inputCls}`}>
                <option value="">미배정</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>학생 연락처</label>
              <input
                name="student_phone"
                defaultValue={student?.student_phone ?? ''}
                placeholder="010-…"
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <label className={labelCls}>학부모 연락처</label>
              <input
                name="parent_phone"
                defaultValue={student?.parent_phone ?? ''}
                placeholder="010-…"
                className={`mt-1 ${inputCls}`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>메모 (선택)</label>
            <input name="memo" defaultValue={student?.memo ?? ''} className={`mt-1 ${inputCls}`} />
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
              className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {pending ? '저장 중…' : mode === 'create' ? '등록' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
