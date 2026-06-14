'use client'

import { useActionState, useEffect, useRef, useTransition } from 'react'
import type { School } from '@/lib/students'
import { addSchool, deleteSchool, type SchoolFormState } from '@/app/actions/schools'

const inputCls =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'

// 학교 목록 관리 모달 — 원장 전용.
// 학생 등록 모달과 동일한 팝업 형식. 상단 추가 폼 + 하단 목록(삭제).
export function SchoolManagerModal({
  schools,
  onClose,
}: {
  schools: School[]
  onClose: () => void
}) {
  const [state, formAction, pending] = useActionState<SchoolFormState, FormData>(
    addSchool,
    undefined
  )
  const formRef = useRef<HTMLFormElement>(null)

  // 추가 성공 시 입력창 초기화(목록은 revalidate 로 갱신)
  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            <span>🏫</span> 학교 관리
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
        <p className="mt-1 text-xs text-zinc-400">
          여기서 등록한 학교가 학생 등록·수정 시 드롭다운에 나타납니다.
        </p>

        {/* 학교 추가 */}
        <form ref={formRef} action={formAction} className="mt-4 flex gap-2">
          <input
            name="name"
            placeholder="예: OO중학교"
            className={inputCls}
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={pending}
            className="h-10 shrink-0 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? '추가 중…' : '추가'}
          </button>
        </form>
        {state?.error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {state.error}
          </p>
        )}

        {/* 학교 목록 */}
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            등록된 학교 ({schools.length})
          </div>
          {schools.length === 0 ? (
            <p className="app-card px-4 py-8 text-center text-sm text-zinc-400">
              아직 등록된 학교가 없습니다. 위에서 추가해 주세요.
            </p>
          ) : (
            <ul className="max-h-64 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200 dark:divide-zinc-800/70 dark:border-zinc-800">
              {schools.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="text-zinc-700 dark:text-zinc-200">{s.name}</span>
                  <SchoolDeleteButton id={s.id} name={s.name} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

function SchoolDeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition()
  const onClick = () => {
    if (!window.confirm(`'${name}' 학교를 목록에서 삭제할까요? (이미 등록된 학생 정보에는 영향 없음)`))
      return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(() => deleteSchool(fd))
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
    >
      {pending ? '삭제 중…' : '삭제'}
    </button>
  )
}
