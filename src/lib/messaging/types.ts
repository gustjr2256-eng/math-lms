// 메시징 모듈 공유 타입.

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

// 솔라피 송신 단위 (단문 SMS / 장문 LMS / 알림톡 ATA)
export type SolapiMessage = {
  to: string
  text: string
  type: 'SMS' | 'LMS' | 'ATA'
}

// 발송 업체 자격증명 (DB academy_settings 또는 env 에서 해석)
export type Credentials = {
  apiKey: string
  apiSecret: string
  sender: string
}
