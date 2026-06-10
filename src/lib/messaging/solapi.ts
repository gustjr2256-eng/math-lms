import 'server-only'
import crypto from 'crypto'

// Solapi(솔라피) 송신 핸들러.
// 실제 API 키 연동 단계에서 이 함수가 호출된다. 키가 없으면 isConfigured()=false.
// 문서: https://developers.solapi.com  (POST /messages/v4/send-many/detail)

const ENDPOINT = 'https://api.solapi.com/messages/v4/send-many/detail'

export function isConfigured() {
  return Boolean(
    process.env.SOLAPI_API_KEY &&
      process.env.SOLAPI_API_SECRET &&
      process.env.SOLAPI_SENDER
  )
}

// Solapi 는 HMAC-SHA256 서명 인증을 사용한다.
function authorizationHeader() {
  const apiKey = process.env.SOLAPI_API_KEY as string
  const apiSecret = process.env.SOLAPI_API_SECRET as string
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(32).toString('hex')
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex')
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

export type SolapiMessage = {
  to: string
  text: string
  // SMS(단문) / LMS(장문) / ATA(알림톡)
  type: 'SMS' | 'LMS' | 'ATA'
}

export async function solapiSendMany(messages: SolapiMessage[]) {
  const from = process.env.SOLAPI_SENDER as string

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: authorizationHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({
        to: m.to.replace(/[^0-9]/g, ''),
        from,
        text: m.text,
        type: m.type,
      })),
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Solapi 오류 ${res.status}: ${detail}`)
  }

  return (await res.json()) as {
    groupInfo?: unknown
    failedMessageList?: { to: string }[]
  }
}
