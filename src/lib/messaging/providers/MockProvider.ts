import type { MessageProvider } from './MessageProvider'
import type { SolapiMessage, SendResult } from '../types'

// 키 미설정 시 dry-run. 실제 발송 없이 콘솔에만 기록한다.
// → API Key 없이도 전체 발송 흐름을 검증할 수 있다.
export class MockProvider implements MessageProvider {
  readonly name = 'mock'

  async send(messages: SolapiMessage[]): Promise<SendResult[]> {
    for (const m of messages) {
      console.log(`[messaging:mock] (${m.type}) → ${m.to}: ${m.text}`)
    }
    return messages.map((m) => ({ to: m.to, ok: true }))
  }
}
