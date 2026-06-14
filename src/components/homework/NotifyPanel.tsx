'use client'

import { useState, useTransition } from 'react'
import { sendNotifications, type NotifyResult } from '@/app/actions/notify'

type Student = { id: string; name: string }

const DEFAULT_MESSAGE =
  '[OO수학학원] {이름} 학생이 숙제를 제출하지 않았습니다. 확인 부탁드립니다.'

// 미제출자 선택 + 메시지 작성 + 알림 발송.
export function NotifyPanel({
  homeworkId,
  classId,
  nonSubmitters,
}: {
  homeworkId: string
  classId: string
  nonSubmitters: Student[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [recipient, setRecipient] = useState<'parent' | 'student'>('parent')
  const [channel, setChannel] = useState<'sms' | 'kakao'>('sms')
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<NotifyResult | null>(null)

  const allChecked = nonSubmitters.length > 0 && selected.size === nonSubmitters.length

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(nonSubmitters.map((s) => s.id)))

  const send = () => {
    setResult(null)
    startTransition(async () => {
      const res = await sendNotifications({
        homeworkId,
        classId,
        studentIds: [...selected],
        message,
        channel,
        recipient,
      })
      setResult(res)
      if (res.ok) setSelected(new Set())
    })
  }

  return (
    <div className="app-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          미제출자 알림{' '}
          <span className="text-sm font-normal text-zinc-400">{nonSubmitters.length}명</span>
        </h3>
        {nonSubmitters.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} />
            전체 선택
          </label>
        )}
      </div>

      {nonSubmitters.length === 0 ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          🎉 모든 학생이 제출했습니다.
        </p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-2">
            {nonSubmitters.map((s) => {
              const on = selected.has(s.id)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={
                      'rounded-full border px-3 py-1.5 text-sm transition-colors ' +
                      (on
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-white dark:text-zinc-900'
                        : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800')
                    }
                  >
                    {s.name}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <fieldset className="flex items-center gap-2">
              <span className="text-zinc-500">받는 사람</span>
              <Radio name="recipient" value="parent" checked={recipient === 'parent'} onChange={() => setRecipient('parent')} label="학부모" />
              <Radio name="recipient" value="student" checked={recipient === 'student'} onChange={() => setRecipient('student')} label="학생" />
            </fieldset>
            <fieldset className="flex items-center gap-2">
              <span className="text-zinc-500">채널</span>
              <Radio name="channel" value="sms" checked={channel === 'sms'} onChange={() => setChannel('sms')} label="문자" />
              <Radio name="channel" value="kakao" checked={channel === 'kakao'} onChange={() => setChannel('kakao')} label="알림톡" />
            </fieldset>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-400">
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{'{이름}'}</code> 은 각 학생
            이름으로 자동 치환됩니다.
          </p>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-zinc-400">{selected.size}명 선택됨</span>
            <button
              type="button"
              onClick={send}
              disabled={pending || selected.size === 0}
              className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {pending ? '발송 중…' : '알림 발송'}
            </button>
          </div>

          {result && (
            <div
              className={
                'mt-3 rounded-lg px-3 py-2 text-sm ' +
                (result.ok
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400')
              }
            >
              {result.ok ? (
                <>
                  발송 완료: 성공 {result.sent}건{result.failed ? `, 실패 ${result.failed}건` : ''}
                  {result.mock && ' · ⚠️ 현재 API 키 미설정으로 실제 발송 없이 시뮬레이션(mock)되었습니다.'}
                </>
              ) : (
                result.error
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Radio({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="flex items-center gap-1">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}
