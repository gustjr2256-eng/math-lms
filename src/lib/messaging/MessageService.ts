import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { SolapiProvider } from './providers/SolapiProvider'
import { MockProvider } from './providers/MockProvider'
import type {
  MessageChannel,
  OutgoingMessage,
  BulkSendOutcome,
  SolapiMessage,
  Credentials,
} from './types'

// 본문 길이/채널에 따라 SMS(단문) / LMS(장문) / ATA(알림톡) 매핑.
function toSolapiType(channel: MessageChannel, text: string): SolapiMessage['type'] {
  if (channel === 'kakao') return 'ATA'
  // 한글 기준 대략 45자(=90바이트) 초과면 LMS
  return Buffer.byteLength(text, 'utf8') > 90 ? 'LMS' : 'SMS'
}

// DB academy_settings → env 순으로 자격증명 해석. 둘 다 없으면 null(=mock).
async function resolveCredentials(): Promise<Credentials | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('academy_settings')
      .select('solapi_api_key, solapi_api_secret, solapi_sender')
      .eq('id', 1)
      .maybeSingle()
    if (data?.solapi_api_key && data.solapi_api_secret && data.solapi_sender) {
      return {
        apiKey: data.solapi_api_key,
        apiSecret: data.solapi_api_secret,
        sender: data.solapi_sender,
      }
    }
  } catch {
    // academy_settings 테이블 미적용 등 → env 폴백
  }

  if (process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SOLAPI_SENDER) {
    return {
      apiKey: process.env.SOLAPI_API_KEY,
      apiSecret: process.env.SOLAPI_API_SECRET,
      sender: process.env.SOLAPI_SENDER,
    }
  }
  return null
}

// 대량 발송 진입점. 키가 없으면 mock(dry-run)으로 동작한다.
// 기존 sendBulk 시그니처를 그대로 유지해 숙제 알림(notify.ts)과 한 경로로 통합된다.
export async function sendBulk(
  channel: MessageChannel,
  messages: OutgoingMessage[]
): Promise<BulkSendOutcome> {
  const valid = messages.filter((m) => m.to.replace(/[^0-9]/g, '').length >= 9)

  const creds = await resolveCredentials()
  const provider = creds ? new SolapiProvider() : new MockProvider()
  const mock = !creds

  const payload: SolapiMessage[] = valid.map((m) => ({
    to: m.to,
    text: m.text,
    type: toSolapiType(channel, m.text),
  }))

  try {
    const raw = await provider.send(payload, creds)
    // provider 결과(to 기준 순서 보존)에 ref 를 다시 부착
    const results = valid.map((m, i) => ({ to: m.to, ref: m.ref, ok: raw[i]?.ok ?? false }))
    return {
      mock,
      results,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length + (messages.length - valid.length),
    }
  } catch (e) {
    return {
      mock,
      results: valid.map((m) => ({ to: m.to, ref: m.ref, ok: false, error: (e as Error).message })),
      sent: 0,
      failed: messages.length,
    }
  }
}
