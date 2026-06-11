import 'server-only'
import crypto from 'crypto'
import type { MessageProvider } from './MessageProvider'
import type { SolapiMessage, SendResult, Credentials } from '../types'

// Solapi(솔라피) 송신 핸들러.
// 문서: https://developers.solapi.com  (POST /messages/v4/send-many/detail)
// HMAC-SHA256 서명 인증을 사용한다. 키는 호출측(MessageService)이 주입한다.
const ENDPOINT = 'https://api.solapi.com/messages/v4/send-many/detail'

function authorizationHeader(creds: Credentials): string {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(32).toString('hex')
  const signature = crypto
    .createHmac('sha256', creds.apiSecret)
    .update(date + salt)
    .digest('hex')
  return `HMAC-SHA256 apiKey=${creds.apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

export class SolapiProvider implements MessageProvider {
  readonly name = 'solapi'

  async send(messages: SolapiMessage[], creds: Credentials | null): Promise<SendResult[]> {
    if (!creds) throw new Error('Solapi 자격증명이 없습니다.')

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: authorizationHeader(creds),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          to: m.to.replace(/[^0-9]/g, ''),
          from: creds.sender,
          text: m.text,
          type: m.type,
        })),
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Solapi 오류 ${res.status}: ${detail}`)
    }

    const json = (await res.json()) as { failedMessageList?: { to: string }[] }
    const failed = new Set((json.failedMessageList ?? []).map((f) => f.to.replace(/[^0-9]/g, '')))
    return messages.map((m) => ({
      to: m.to,
      ok: !failed.has(m.to.replace(/[^0-9]/g, '')),
    }))
  }
}
