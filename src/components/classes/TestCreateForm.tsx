'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createTest, type TestFormState } from '@/app/actions/tests'

const inputCls =
  'h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'

// 시험(테스트) 생성 폼.
export function TestCreateForm({ classId }: { classId: string }) {
  const [state, formAction, pending] = useActionState<TestFormState, FormData>(
    createTest,
    undefined
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <details className="app-card p-5">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        + 새 시험 만들기
      </summary>

      <form ref={formRef} action={formAction} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input type="hidden" name="class_id" value={classId} />
        <select name="kind" defaultValue="주간" className={inputCls} required>
          <option value="일일">일일</option>
          <option value="주간">주간</option>
          <option value="기타">기타</option>
        </select>
        <input
          name="title"
          placeholder="시험 이름 (예: 3주차 모의고사)"
          className={`${inputCls} col-span-2`}
          required
        />
        <input name="full_score" type="number" min={1} defaultValue={100} placeholder="만점" className={inputCls} required />
        <input name="test_date" type="date" className={`${inputCls} col-span-2 sm:col-span-1`} required />

        {state?.error && (
          <p className="col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 sm:col-span-4 dark:bg-red-950/40 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="col-span-2 h-10 rounded-lg bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 sm:col-span-1 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? '생성 중…' : '시험 생성'}
        </button>
      </form>
    </details>
  )
}
