'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createClass, type ClassFormState } from '@/app/actions/classes'

type TeacherOption = { id: string; name: string }

const inputCls =
  'h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'

// 원장 전용 반 생성 폼 (담당 강사 지정 포함).
export function ClassCreateForm({ teachers }: { teachers: TeacherOption[] }) {
  const [state, formAction, pending] = useActionState<ClassFormState, FormData>(
    createClass,
    undefined
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <details className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        + 새 반 만들기
      </summary>

      <form ref={formRef} action={formAction} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="name" placeholder="반 이름 (예: 중2 심화 A)" className={inputCls} required />
        <input name="subject" placeholder="과목 (예: 수학)" className={inputCls} required />
        <input name="day_of_week" placeholder="요일 (예: 월,수,금)" className={inputCls} required />
        <input name="time" placeholder="시간 (예: 19:00~21:00)" className={inputCls} required />

        <select name="teacher_id" defaultValue="" className={`${inputCls} sm:col-span-2`} required>
          <option value="" disabled>
            담당 강사 선택
          </option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {state?.error && (
          <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            반이 생성되었습니다.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="sm:col-span-2 h-10 rounded-lg bg-zinc-900 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? '생성 중…' : '반 생성'}
        </button>

        {teachers.length === 0 && (
          <p className="sm:col-span-2 text-xs text-amber-600">
            승인된 강사가 없습니다. 먼저 강사 가입을 승인하세요.
          </p>
        )}
      </form>
    </details>
  )
}
