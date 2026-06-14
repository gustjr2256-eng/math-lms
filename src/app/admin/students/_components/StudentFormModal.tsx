'use client'

import { useActionState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  STUDENT_STATUSES,
  STATUS_LABEL,
  STUDENT_GENDERS,
  STUDENT_GRADES,
  type AdminStudent,
  type School,
} from '@/lib/students'
import {
  addStudent,
  updateStudent,
  type StudentFormState,
} from '@/app/actions/students'
import { PhoneInput } from '@/components/ui/PhoneInput'

const inputCls =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 font-pretendard text-sm outline-none focus:border-brand dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'
const labelCls = 'font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400'

// 학생 등록(create) / 수정(edit) 모달 — 원장 전용.
export function StudentFormModal({
  mode,
  student,
  classes,
  schools,
  onClose,
}: {
  mode: 'create' | 'edit'
  student?: AdminStudent
  classes: { id: string; name: string }[]
  schools: School[]
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

  // 수정 시 기존 학교명이 목록에 없으면 옵션으로 끼워 넣어 선택 유지(데이터 보존)
  const schoolNames = schools.map((s) => s.name)
  const currentSchool = student?.school ?? ''
  const schoolOptions =
    currentSchool && !schoolNames.includes(currentSchool)
      ? [currentSchool, ...schoolNames]
      : schoolNames

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
            {mode === 'create' ? '학생 등록' : '학생 정보 수정'}
          </h2>

          <form action={formAction} className="mt-6 space-y-4">
            {mode === 'edit' && <input type="hidden" name="id" value={student!.id} />}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>이름</label>
                <input name="name" defaultValue={student?.name} className={`mt-1 ${inputCls}`} required />
              </div>
              <div>
                <label className={labelCls}>학년</label>
                <select
                  name="grade"
                  defaultValue={student?.grade ?? ''}
                  className={`mt-1 ${inputCls}`}
                  required
                >
                  <option value="" disabled>
                    선택
                  </option>
                  {STUDENT_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>학교</label>
                <select
                  name="school"
                  defaultValue={currentSchool}
                  className={`mt-1 ${inputCls}`}
                >
                  <option value="">선택 안 함</option>
                  {schoolOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>학생 연락처</label>
                <PhoneInput
                  name="student_phone"
                  defaultValue={student?.student_phone}
                  className={`mt-1 ${inputCls}`}
                />
              </div>
              <div>
                <label className={labelCls}>학부모 연락처</label>
                <PhoneInput
                  name="parent_phone"
                  defaultValue={student?.parent_phone}
                  className={`mt-1 ${inputCls}`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>메모 (선택)</label>
              <input name="memo" defaultValue={student?.memo ?? ''} className={`mt-1 ${inputCls}`} />
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
                {pending ? '저장 중…' : mode === 'create' ? '등록' : '저장'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
