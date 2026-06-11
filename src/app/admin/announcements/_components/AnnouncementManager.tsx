'use client'

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  createAnnouncement,
  setAnnouncementActive,
  deleteAnnouncement,
  type AnnouncementFormState,
} from '@/app/actions/announcements'
import type { Announcement } from '@/lib/announcements'
import { AnimationButton } from '@/components/ui/AnimationButton'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

export type ClassOption = { id: string; name: string }

const inputCls =
  'h-10 w-full rounded-lg border border-cream-line bg-white px-3 font-pretendard text-sm outline-none focus:border-brand/40 dark:border-zinc-700 dark:bg-zinc-900'

export function AnnouncementManager({
  announcements,
  classes,
}: {
  announcements: Announcement[]
  classes: ClassOption[]
}) {
  const [showForm, setShowForm] = useState(false)
  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes])

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
          등록된 공지 <span className="font-pretendard text-sm text-brand/50">{announcements.length}건</span>
        </h2>
        <AnimationButton size="sm" icon="＋" onClick={() => setShowForm(true)}>
          공지 팝업 추가
        </AnimationButton>
      </div>

      <div className="mt-4 space-y-3">
        {announcements.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cream-line px-4 py-10 text-center font-pretendard text-sm text-brand/50 dark:border-zinc-700 dark:text-zinc-400">
            아직 등록된 공지가 없습니다.
          </p>
        ) : (
          announcements.map((a) => (
            <Row
              key={a.id}
              a={a}
              className={a.target === 'class' ? classNameById.get(a.class_id ?? '') ?? '특정 반' : null}
            />
          ))
        )}
      </div>

      {showForm && <CreateModal classes={classes} onClose={() => setShowForm(false)} />}
    </div>
  )
}

function Row({ a, className }: { a: Announcement; className: string | null }) {
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
          <span
            className={
              'rounded-full px-2 py-0.5 font-pretendard text-[11px] font-medium ' +
              (className
                ? 'bg-brand-tint text-brand dark:bg-zinc-800 dark:text-zinc-300'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400')
            }
          >
            {className ? `반: ${className}` : '통합'}
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

function CreateModal({ classes, onClose }: { classes: ClassOption[]; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<AnnouncementFormState, FormData>(
    createAnnouncement,
    undefined
  )
  const formRef = useRef<HTMLFormElement>(null)
  const [target, setTarget] = useState<'all' | 'class'>('all')

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
          {/* 대상: 통합 / 특정 반 */}
          <div>
            <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">대상</label>
            <div className="mt-1 flex items-center gap-3">
              <div className="inline-flex rounded-lg border border-cream-line p-0.5 dark:border-zinc-700">
                {(['all', 'class'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTarget(t)}
                    className={
                      'rounded-md px-3 py-1.5 font-pretendard text-sm transition-colors ' +
                      (target === t
                        ? 'bg-brand text-white dark:bg-gold dark:text-[#0a192f]'
                        : 'text-brand/70 hover:bg-brand-tint dark:text-zinc-300 dark:hover:bg-zinc-800')
                    }
                  >
                    {t === 'all' ? '통합 공지' : '특정 반'}
                  </button>
                ))}
              </div>
              {target === 'class' && (
                <select
                  name="class_id"
                  defaultValue=""
                  className={`${inputCls} max-w-[12rem]`}
                  required
                >
                  <option value="" disabled>
                    대상 반 선택
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <input type="hidden" name="target" value={target} />
          </div>

          <div>
            <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">제목</label>
            <input name="title" placeholder="예: 7월 휴원 안내" className={`mt-1 ${inputCls}`} required />
          </div>
          <div>
            <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">본문</label>
            <div className="mt-1">
              <RichTextEditor name="body_html" />
            </div>
          </div>
          <div>
            <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">
              이미지 (선택 · 최대 5MB)
            </label>
            <input
              name="image"
              type="file"
              accept="image/*"
              className="mt-1 w-full rounded-lg border border-cream-line bg-white px-3 py-2 font-pretendard text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white dark:border-zinc-700 dark:bg-zinc-900 dark:file:bg-gold dark:file:text-[#0a192f]"
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
            <AnimationButton type="submit" disabled={pending}>
              {pending ? '등록 중…' : '공지 등록'}
            </AnimationButton>
          </div>
        </form>
      </div>
    </div>
  )
}
