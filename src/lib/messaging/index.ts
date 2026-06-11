// 메시징 모듈 진입점.
// 발송 로직은 MessageService(provider 추상화)로 위임한다. 기존 호출부(notify.ts 등)는
// sendBulk / MessageChannel 만 사용하므로 시그니처 변경 없이 그대로 동작한다.
export type {
  MessageChannel,
  OutgoingMessage,
  SendResult,
  BulkSendOutcome,
} from './types'
export { sendBulk } from './MessageService'
