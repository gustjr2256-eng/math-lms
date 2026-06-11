'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import {
  createAnnouncement,
  setAnnouncementActive,
  deleteAnnouncement,
  type AnnouncementFormState,
} from '@/app/actions/announcements'
import type { Announcement } from '@/lib/announcements'

const inputCls =
  'h-10 w-full rounded-lg border border-cream-line bg-white px-3 font-pretendard text-sm outline-none focus:border-brand/40 dark:border-zinc-700 dark:bg-zinc-900'

export function AnnouncementManager({ announcements }: { announcements: Announcement[] }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
          등록된 공지 <span className="font-pretendard text-sm text-brand/50">{announcements.length}건</span>
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex h-9 items-center rounded-lg bg-brand px-4 font-pretendard text-sm font-semibold text-white hover:bg-brand-strong"
        >
          + 공지 팝업 추가
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {announcements.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cream-line px-4 py-10 text-center font-pretendard text-sm text-brand/50 dark:border-zinc-700 dark:text-zinc-400">
            아직 등록된 공지가 없습니다.
          </p>
        ) : (
          announcements.map((a) => <Row key={a.id} a={a} />)
        )}
      </div>

      {showForm && <CreateModal onClose={() => setShowForm(false)} />}
    </div>
  )
}

function Row({ a }: { a: Announcement }) {
  const [pending, startTransition] = useTransition()

  const toggle = () => {
    const fd = new FormData()
    fd.set('id', a.id)
    fd.set('active', String(!a.active))
    startTransition(() => setAnnouncementActive(fd))
  }
  const remove = () => {
    if (!window.confirm('이 공지를 삭제할까요?')) return
    const fd = new FormData()
    fd.set('id', a.id)
    startTransition(() => deleteAnnouncement(fd))
  }

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-cream-line bg-cream-card p-4 dark:border-zinc-800 dark:bg-zinc-950">
      {a.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={
              'rounded-full px-2 py-0.5 font-pretendard text-[11px] font-medium ' +
              (a.active
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400')
            }
          >
            {a.active ? '노출중' : '숨김'}
          </span>
          <h3 className="truncate font-paperozi font-semibold text-brand dark:text-zinc-50">
            {a.title}
          </h3>
        </div>
        <p className="mt-1 line-clamp-2 font-pretendard text-sm text-brand/60 dark:text-zinc-400">
          {a.body}
        </p>
        <p className="mt-1 font-pretendard text-xs text-brand/40 dark:text-zinc-500">
          {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(
            new Date(a.created_at)
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className="rounded-md border border-cream-line px-2.5 py-1 font-pretendard text-xs text-brand hover:bg-brand-tint disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {a.active ? '숨기기' : '노출'}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="rounded-md px-2.5 py-1 font-pretendard text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
        >
          삭제
        </button>
      </div>
    </div>
  )
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<AnnouncementFormState, FormData>(
    createAnnouncement,
    undefined
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) onClose()
  }, [state, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-cream-line bg-cream-card p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-paperozi text-lg font-semibold text-brand dark:text-zinc-50">
            새 공지 팝업
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-brand/50 hover:text-brand dark:text-zinc-400">
            ✕
          </button>
        </div>

        <form ref={formRef} action={formAction} className="mt-5 space-y-4">
          <div>
            <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">제목</label>
            <input name="title" placeholder="예: 7월 휴원 안내" className={`mt-1 ${inputCls}`} required />
          </div>
          <div>
            <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">본문</label>
            <textarea
              name="body"
              rows={4}
              placeholder="공지 내용을 입력하세요."
              className="mt-1 w-full rounded-lg border border-cream-line bg-white p-3 font-pretendard text-sm outline-none focus:border-brand/40 dark:border-zinc-700 dark:bg-zinc-900"
              required
            />
          </div>
          <div>
            <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">
              이미지 (선택 · 최대 5MB)
            </label>
            <input
              name="image"
              type="file"
              accept="image/*"
              className="mt-1 w-full rounded-lg border border-cream-line bg-white px-3 py-2 font-pretendard text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white dark:border-zinc-700 dark:bg-zinc-900"
            />
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
              className="h-10 rounded-lg border border-cream-line px-4 font-pretendard text-sm font-medium text-brand hover:bg-brand-tint dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-lg bg-brand px-5 font-pretendard text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
            >
              {pending ? '등록 중…' : '공지 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
