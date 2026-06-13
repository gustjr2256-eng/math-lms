'use client'

import { useState, useTransition } from 'react'
import { updateTeacherPermissions } from '@/app/actions/admin'
import { PERMISSION_KEYS, PERMISSION_LABELS, type PermissionKey } from '@/lib/permissions'

export function TeacherPermissionsModal({
  userId,
  name,
  current,
  onClose,
}: {
  userId: string
  name: string
  current: Record<PermissionKey, boolean>
  onClose: () => void
}) {
  const [vals, setVals] = useState<Record<PermissionKey, boolean>>(current)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const submit = () => {
    setErr(null)
    const fd = new FormData()
    fd.set('userId', userId)
    for (const key of PERMISSION_KEYS) if (vals[key]) fd.set(key, 'on')
    startTransition(async () => {
      try {
        await updateTeacherPermissions(fd)
        onClose()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-cream-line bg-cream-card p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-paperozi text-lg font-bold text-brand dark:text-zinc-50">
          {name} · 권한 설정
        </h2>
        <ul className="mt-4 flex flex-col gap-1">
          {PERMISSION_KEYS.map((key) => (
            <li key={key}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-brand-tint dark:hover:bg-zinc-900">
                <input
                  type="checkbox"
                  checked={vals[key]}
                  onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.checked }))}
                  className="mt-1 h-4 w-4 accent-brand dark:accent-gold"
                />
                <span>
                  <span className="block text-sm font-medium text-brand dark:text-zinc-100">
                    {PERMISSION_LABELS[key].label}
                  </span>
                  <span className="block text-xs text-brand/60 dark:text-zinc-400">
                    {PERMISSION_LABELS[key].desc}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        {err && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-cream-line px-4 text-sm text-brand dark:border-zinc-700 dark:text-zinc-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-gold dark:text-[#0a192f]"
          >
            {pending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
