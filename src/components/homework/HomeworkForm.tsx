'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createHomework, type HomeworkFormState } from '@/app/actions/homework'

const inputCls =
  'h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'

// 강사용 숙제 생성 폼.
export function HomeworkForm({ classId }: { classId: string }) {
  const [state, formAction, pending] = useActionState<HomeworkFormState, FormData>(
    createHomework,
    undefined
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <details className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        + 새 숙제 만들기
      </summary>

      <form ref={formRef} action={formAction} className="mt-4 grid grid-cols-2 gap-3">
        <input type="hidden" name="class_id" value={classId} />
        <input name="title" placeholder="과제명 (예: 3단원 워크북 p.12~20)" className={`${inputCls} col-span-2`} required />
        <input name="due_date" type="date" className={inputCls} required />
        <input name="description" placeholder="설명 (선택)" className={inputCls} />

        {state?.error && (
          <p className="col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="col-span-2 h-10 rounded-lg bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? '생성 중…' : '숙제 생성'}
        </button>
      </form>
    </details>
  )
}
