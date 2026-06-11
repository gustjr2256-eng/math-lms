// 설정 페이지 공유 타입.
// secret 원문은 클라이언트로 보내지 않고 '설정됨' 여부만 노출한다.
export type MessagingSettingsView = {
  sender: string
  apiKeySet: boolean
  apiSecretSet: boolean
  kakaoPfId: string
}

// 솔라피 연결이 완전한지(키·시크릿·발신번호 모두) 판정
export function isMessagingConnected(s: MessagingSettingsView): boolean {
  return s.apiKeySet && s.apiSecretSet && s.sender.trim() !== ''
}
