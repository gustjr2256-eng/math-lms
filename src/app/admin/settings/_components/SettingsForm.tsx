'use client'

import { useActionState } from 'react'
import { saveMessagingSettings, type SettingsFormState } from '@/app/actions/settings'
import { isMessagingConnected, type MessagingSettingsView } from '@/lib/settings'
import { AnimationButton } from '@/components/ui/AnimationButton'

const inputCls =
  'h-10 w-full rounded-lg border border-cream-line bg-white px-3 font-pretendard text-sm outline-none focus:border-brand/40 dark:border-zinc-700 dark:bg-zinc-900'
const labelCls = 'font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400'

export function SettingsForm({ initial }: { initial: MessagingSettingsView }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    saveMessagingSettings,
    undefined
  )
  const connected = isMessagingConnected(initial)

  return (
    <div className="mt-6 app-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
          솔라피(Solapi) 문자·알림톡
        </h2>
        <span
          className={
            'rounded-full px-2.5 py-0.5 font-pretendard text-[11px] font-medium ' +
            (connected
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400')
          }
        >
          {connected ? '연결됨' : '미설정'}
        </span>
      </div>
      <p className="mt-1 font-pretendard text-xs text-brand/50 dark:text-zinc-500">
        키를 입력하지 않으면 발송은 테스트(mock) 모드로 동작합니다. solapi.com 콘솔에서 발급한
        API Key / Secret / 등록된 발신번호를 입력하세요.
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <div>
          <label className={labelCls}>발신번호 (등록된 발신번호)</label>
          <input
            name="sender"
            defaultValue={initial.sender}
            placeholder="01012345678"
            className={`mt-1 ${inputCls}`}
          />
        </div>
        <div>
          <label className={labelCls}>API Key</label>
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={initial.apiKeySet ? '●●●● 설정됨 (변경 시에만 입력)' : 'API Key 입력'}
            className={`mt-1 ${inputCls}`}
          />
        </div>
        <div>
          <label className={labelCls}>API Secret</label>
          <input
            name="apiSecret"
            type="password"
            autoComplete="off"
            placeholder={initial.apiSecretSet ? '●●●● 설정됨 (변경 시에만 입력)' : 'API Secret 입력'}
            className={`mt-1 ${inputCls}`}
          />
        </div>
        <div>
          <label className={labelCls}>알림톡 발신 프로필 ID (선택)</label>
          <input
            name="kakaoPfId"
            defaultValue={initial.kakaoPfId}
            placeholder="카카오 비즈니스 채널 PF_ID (알림톡 사용 시)"
            className={`mt-1 ${inputCls}`}
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 font-pretendard text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 font-pretendard text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            설정이 저장되었습니다.
          </p>
        )}

        <div className="flex justify-end pt-1">
          <AnimationButton type="submit" disabled={pending}>
            {pending ? '저장 중…' : '설정 저장'}
          </AnimationButton>
        </div>
      </form>
    </div>
  )
}
