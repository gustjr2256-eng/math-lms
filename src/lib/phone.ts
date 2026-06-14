// 전화번호 자동 하이픈 포맷.
//   휴대폰(010, 11자리) → 010-1111-2222 (3-4-4)
//   구형 휴대폰/지역(10자리) → 0XX-XXX-XXXX (3-3-4)
//   서울(02) → 02-XXXX-XXXX / 02-XXX-XXXX
// 숫자만 추출 후 길이에 따라 하이픈을 삽입한다(입력 중에도 자연스럽게).
export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''

  // 서울 지역번호 02
  if (d.startsWith('02')) {
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`
  }

  // 3자리 국번(010, 031, 070 …)
  if (d.length <= 3) return d
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`
}
