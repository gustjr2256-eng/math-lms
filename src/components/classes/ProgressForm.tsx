'use client'

import { useActionState, useEffect, useRef } from 'react'
import { addProgress, type ProgressFormState } from '@/app/actions/progress'

const inputCls =
  'h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'

// 진도 기록 입력 폼.
export function ProgressForm({ classId, today }: { classId: string; today: string }) {
  const [state, formAction, pending] = useActionState<ProgressFormState, FormData>(
    addProgress,
    undefined
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-2 gap-3 app-card p-5 sm:grid-cols-4"
    >
      <input type="hidden" name="class_id" value={classId} />
      <input name="date" type="date" defaultValue={today} className={inputCls} required />
      <input name="textbook" placeholder="교재명 (예: 쎈 수학(상))" className={`${inputCls} col-span-2 sm:col-span-1`} required />
      <input name="chapter" placeholder="단원 (예: 이차함수)" className={inputCls} />
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
        <input name="page_from" type="number" min={0} placeholder="시작p" className={`${inputCls} w-full`} />
        <span className="text-zinc-400">~</span>
        <input name="page_to" type="number" min={0} placeholder="끝p" className={`${inputCls} w-full`} />
      </div>
      <input name="memo" placeholder="메모" className={`${inputCls} col-span-2 sm:col-span-3`} />

      <button
        type="submit"
        disabled={pending}
        className="col-span-2 h-10 rounded-lg bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 sm:col-span-1 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? '기록 중…' : '진도 기록'}
      </button>

      {state?.error && (
        <p className="col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-4 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  )
}
