'use client'

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from 'react'
import { sendTargetedMessage, type SendMessageResult } from '@/app/actions/messages'
import { AnimationButton } from '@/components/ui/AnimationButton'

export type ComposerClass = { id: string; name: string }
export type ComposerStudent = {
  id: string
  name: string
  grade: string | null
  class_id: string | null
  status: string
}

const UNASSIGNED = 'none'

export function MessageComposer({
  classes,
  students,
}: {
  classes: ComposerClass[]
  students: ComposerStudent[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)

  // 반(class_id) 기준 그룹 — 반 순서 + 마지막에 미배정
  const groups = useMemo(() => {
    const byClass = new Map<string, ComposerStudent[]>()
    for (const s of students) {
      const k = s.class_id ?? UNASSIGNED
      if (!byClass.has(k)) byClass.set(k, [])
      byClass.get(k)!.push(s)
    }
    const ordered: { key: string; label: string; rows: ComposerStudent[] }[] = []
    for (const c of classes) {
      if (byClass.has(c.id)) ordered.push({ key: c.id, label: c.name, rows: byClass.get(c.id)! })
    }
    if (byClass.has(UNASSIGNED))
      ordered.push({ key: UNASSIGNED, label: '미배정', rows: byClass.get(UNASSIGNED)! })
    return ordered
  }, [students, classes])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === students.length ? new Set() : new Set(students.map((s) => s.id))
    )

  const toggleGroup = (rows: ComposerStudent[]) =>
    setSelected((prev) => {
      const ids = rows.map((s) => s.id)
      const allOn = ids.every((id) => prev.has(id))
      const n = new Set(prev)
      ids.forEach((id) => (allOn ? n.delete(id) : n.add(id)))
      return n
    })

  const allChecked = students.length > 0 && selected.size === students.length
  const selectedIds = useMemo(() => [...selected], [selected])

  return (
    <div className="mt-6">
      {/* 상단 액션 바 */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-cream-line bg-cream-card/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <label className="flex items-center gap-2 font-pretendard text-sm font-medium text-brand dark:text-zinc-100">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 accent-[#792316]" />
          전체 선택
        </label>
        <div className="flex items-center gap-3">
          <span className="font-pretendard text-sm text-brand/60 dark:text-zinc-400">
            선택 <b className="text-brand dark:text-zinc-100">{selected.size}</b>명
          </span>
          <AnimationButton
            size="sm"
            icon="✉️"
            disabled={selected.size === 0}
            onClick={() => setOpen(true)}
          >
            메시지 발송
          </AnimationButton>
        </div>
      </div>

      {/* 반별 그룹 */}
      <div className="mt-4 space-y-4">
        {groups.length === 0 && (
          <p className="app-card px-4 py-10 text-center font-pretendard text-sm text-brand/50 dark:text-zinc-400">
            재원(ACTIVE) 학생이 없습니다.
          </p>
        )}
        {groups.map((g) => {
          const ids = g.rows.map((s) => s.id)
          const groupAll = ids.every((id) => selected.has(id))
          const groupSome = ids.some((id) => selected.has(id))
          return (
            <div
              key={g.key}
              className="overflow-hidden app-card"
            >
              <label className="flex items-center gap-2 border-b border-cream-line bg-brand-tint/40 px-4 py-2.5 font-pretendard text-sm font-semibold text-brand dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                <GroupCheckbox checked={groupAll} indeterminate={groupSome && !groupAll} onChange={() => toggleGroup(g.rows)} />
                {g.label}
                <span className="font-normal text-brand/50 dark:text-zinc-500">{g.rows.length}명</span>
              </label>
              <ul className="divide-y divide-cream-line dark:divide-zinc-800">
                {g.rows.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-brand-tint/30 dark:hover:bg-zinc-900">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                        className="h-4 w-4 accent-[#792316]"
                      />
                      <span className="font-pretendard text-sm text-brand dark:text-zinc-100">{s.name}</span>
                      {s.grade && (
                        <span className="font-pretendard text-xs text-brand/45 dark:text-zinc-500">{s.grade}</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {open && (
        <SendModal
          count={selected.size}
          studentIds={selectedIds}
          onClose={() => setOpen(false)}
          onSent={() => setSelected(new Set())}
        />
      )}
    </div>
  )
}

// indeterminate 는 DOM 속성이라 ref 로 설정
function GroupCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 accent-[#792316]"
    />
  )
}

function SendModal({
  count,
  studentIds,
  onClose,
  onSent,
}: {
  count: number
  studentIds: string[]
  onClose: () => void
  onSent: () => void
}) {
  const [channel, setChannel] = useState<'sms' | 'kakao'>('sms')
  const [recipient, setRecipient] = useState<'parent' | 'student'>('parent')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<SendMessageResult | null>(null)
  const [pending, start] = useTransition()

  const submit = () =>
    start(async () => {
      const r = await sendTargetedMessage({ studentIds, channel, recipient, message })
      setResult(r)
      if (r.ok) onSent()
    })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-cream-line bg-cream-card p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-paperozi text-lg font-semibold text-brand dark:text-zinc-50">
            메시지 발송 <span className="font-pretendard text-sm text-brand/50">· {count}명</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-brand/50 hover:text-brand dark:text-zinc-400">
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <Segment
            label="채널"
            value={channel}
            onChange={(v) => setChannel(v as 'sms' | 'kakao')}
            options={[
              { value: 'sms', label: '문자(SMS/LMS)' },
              { value: 'kakao', label: '알림톡' },
            ]}
          />
          <Segment
            label="수신 대상"
            value={recipient}
            onChange={(v) => setRecipient(v as 'parent' | 'student')}
            options={[
              { value: 'parent', label: '학부모' },
              { value: 'student', label: '학생' },
            ]}
          />
          <div>
            <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">
              메시지 내용
            </label>
            <textarea
              value={message}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              rows={5}
              placeholder="안녕하세요 {이름} 학생 학부모님, ..."
              className="mt-1 w-full rounded-lg border border-cream-line bg-white p-3 font-pretendard text-sm outline-none focus:border-brand/40 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 font-pretendard text-xs text-brand/45 dark:text-zinc-500">
              <code>{'{이름}'}</code> 을 넣으면 학생 이름으로 자동 치환됩니다.
            </p>
          </div>

          {result && (
            <p
              className={
                'rounded-lg px-3 py-2 font-pretendard text-sm ' +
                (result.ok
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400')
              }
            >
              {result.ok
                ? `${result.mock ? '(테스트 발송) ' : ''}성공 ${result.sent} · 실패 ${result.failed}`
                : result.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-cream-line px-4 font-pretendard text-sm font-medium text-brand hover:bg-brand-tint dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              닫기
            </button>
            <AnimationButton type="button" disabled={pending} onClick={submit}>
              {pending ? '발송 중…' : '발송'}
            </AnimationButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function Segment({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">{label}</label>
      <div className="mt-1 inline-flex rounded-lg border border-cream-line p-0.5 dark:border-zinc-700">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              'rounded-md px-3 py-1.5 font-pretendard text-sm transition-colors ' +
              (value === o.value
                ? 'bg-brand text-white dark:bg-gold dark:text-[#0a192f]'
                : 'text-brand/70 hover:bg-brand-tint dark:text-zinc-300 dark:hover:bg-zinc-800')
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
