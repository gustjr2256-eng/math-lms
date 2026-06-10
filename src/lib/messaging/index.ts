import 'server-only'
import { isConfigured, solapiSendMany, type SolapiMessage } from './solapi'

export type MessageChannel = 'sms' | 'kakao'

export type OutgoingMessage = {
  to: string // 수신 번호
  text: string // 치환 완료된 본문
  ref?: string // 호출측 식별자(예: studentId) — 결과 매칭용
}

export type SendResult = {
  to: string
  ref?: string
  ok: boolean
  error?: string
}

export type BulkSendOutcome = {
  mock: boolean // 키 미설정으로 실제 발송 없이 시뮬레이션했는지
  results: SendResult[]
  sent: number
  failed: number
}

// 문자(LMS/SMS)는 길이에 따라, 카카오 알림톡은 ATA 로 매핑.
function toSolapiType(channel: MessageChannel, text: string): SolapiMessage['type'] {
  if (channel === 'kakao') return 'ATA'
  // 한글 기준 대략 45자 초과면 LMS
  return Buffer.byteLength(text, 'utf8') > 90 ? 'LMS' : 'SMS'
}

// 대량 발송 진입점. 키가 없으면 mock(dry-run)으로 동작한다.
export async function sendBulk(
  channel: MessageChannel,
  messages: OutgoingMessage[]
): Promise<BulkSendOutcome> {
  const valid = messages.filter((m) => m.to.replace(/[^0-9]/g, '').length >= 9)

  // ── 키 미설정: mock 모드 ──
  if (!isConfigured()) {
    for (const m of valid) {
      console.log(`[messaging:mock] (${channel}) → ${m.to}: ${m.text}`)
    }
    return {
      mock: true,
      results: valid.map((m) => ({ to: m.to, ref: m.ref, ok: true })),
      sent: valid.length,
      failed: messages.length - valid.length,
    }
  }

  // ── 실제 발송 ──
  try {
    const payload: SolapiMessage[] = valid.map((m) => ({
      to: m.to,
      text: m.text,
      type: toSolapiType(channel, m.text),
    }))
    const res = await solapiSendMany(payload)
    const failedSet = new Set((res.failedMessageList ?? []).map((f) => f.to.replace(/[^0-9]/g, '')))

    const results: SendResult[] = valid.map((m) => ({
      to: m.to,
      ref: m.ref,
      ok: !failedSet.has(m.to.replace(/[^0-9]/g, '')),
    }))
    return {
      mock: false,
      results,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length + (messages.length - valid.length),
    }
  } catch (e) {
    return {
      mock: false,
      results: valid.map((m) => ({ to: m.to, ref: m.ref, ok: false, error: (e as Error).message })),
      sent: 0,
      failed: messages.length,
    }
  }
}
