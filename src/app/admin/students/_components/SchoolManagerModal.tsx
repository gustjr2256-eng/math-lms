'use client'

import { useActionState, useEffect, useRef, useTransition } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { School } from '@/lib/students'
import { addSchool, deleteSchool, type SchoolFormState } from '@/app/actions/schools'

const inputCls =
  'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 font-pretendard text-sm outline-none focus:border-brand dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'

// 학교 목록 관리 모달 — 원장 전용.
// 학생 상세 모달과 동일한 팝업 형식. 상단 추가 폼 + 하단 목록(삭제).
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
          className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-cream-card p-8 shadow-2xl ring-1 ring-cream-line dark:bg-zinc-950 dark:ring-zinc-800"
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

          <h2 className="flex items-center gap-2 font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">
            <span>🏫</span> 학교 관리
          </h2>
          <p className="mt-1 font-pretendard text-sm text-brand/55 dark:text-zinc-400">
            여기서 등록한 학교가 학생 등록·수정 시 드롭다운에 나타납니다.
          </p>

          {/* 학교 추가 */}
          <form ref={formRef} action={formAction} className="mt-6 flex gap-2">
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
              className="h-10 shrink-0 rounded-lg bg-brand px-4 font-pretendard text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60 dark:bg-gold dark:text-[#0a192f] dark:hover:bg-gold-strong"
            >
              {pending ? '추가 중…' : '추가'}
            </button>
          </form>
          {state?.error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 font-pretendard text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {state.error}
            </p>
          )}

          {/* 학교 목록 */}
          <div className="mt-6 rounded-2xl border border-cream-line bg-cream p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="mb-2 font-pretendard text-xs font-medium text-brand/55 dark:text-zinc-400">
              등록된 학교 ({schools.length})
            </div>
            {schools.length === 0 ? (
              <p className="py-8 text-center font-pretendard text-sm text-brand/40 dark:text-zinc-500">
                아직 등록된 학교가 없습니다. 위에서 추가해 주세요.
              </p>
            ) : (
              <ul className="max-h-64 divide-y divide-cream-line overflow-y-auto rounded-xl border border-cream-line bg-cream-card dark:divide-zinc-800/70 dark:border-zinc-800 dark:bg-zinc-950">
                {schools.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between px-4 py-2.5 font-pretendard text-sm"
                  >
                    <span className="text-brand/80 dark:text-zinc-200">{s.name}</span>
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
              className="h-10 rounded-lg border border-cream-line px-4 font-pretendard text-sm text-brand/70 hover:bg-cream dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
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
      className="rounded-md px-2 py-1 font-pretendard text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
    >
      {pending ? '삭제 중…' : '삭제'}
    </button>
  )
}
