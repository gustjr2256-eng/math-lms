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
  // 과거 날짜 마감 방지(오늘 이후만 선택 가능)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <details className="app-card p-5">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        + 새 숙제 만들기
      </summary>

      <form ref={formRef} action={formAction} className="mt-4 grid grid-cols-2 gap-3">
        <input type="hidden" name="class_id" value={classId} />
        <input name="title" placeholder="과제명 (예: 3단원 워크북 p.12~20)" className={`${inputCls} col-span-2`} required />
        <div>
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">제출 시작일</label>
          <input name="start_date" type="date" defaultValue={today} className={`mt-1 w-full ${inputCls}`} required />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">제출 종료일</label>
          <input name="due_date" type="date" min={today} className={`mt-1 w-full ${inputCls}`} required />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">설명 (선택)</label>
          <input name="description" placeholder="설명" className={`mt-1 w-full ${inputCls}`} />
        </div>

        <p className="col-span-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          📅 기간 중 제출 전 학생은 <b>‘제출 전(대기)’</b>, 종료일까지 제출 안 하면 <b>‘미제출자’</b>로 분류되어
          따로 문자를 보낼 수 있습니다. <b>종료 후에도 지각 제출은 가능</b>하며, 늦게라도 내면 미제출자에서 빠집니다.
        </p>

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
