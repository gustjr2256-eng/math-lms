import type { SolapiMessage, SendResult, Credentials } from '../types'

// 메시지 발송 업체 추상화.
// 솔라피 외 다른 업체로 교체하려면 이 인터페이스를 구현한 provider 를 추가하고
// MessageService.pickProvider() 한 줄만 바꾸면 된다.
export interface MessageProvider {
  readonly name: string
  send(messages: SolapiMessage[], creds: Credentials | null): Promise<SendResult[]>
}
