// 서버측 allowlist sanitize.
// 작성자=신뢰된 원장 1인·단일 테넌트라 위험은 낮지만, 저장 전에 방어적으로
// 위험 요소(script/style, on* 핸들러, javascript: URL)와 비허용 태그를 제거한다.
// 주의: 완전한 sanitizer가 아니며 신뢰된 작성자 입력에만 사용한다(외부 입력 금지).

const ALLOWED = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'P', 'BR', 'UL', 'OL', 'LI', 'H2', 'H3', 'A', 'DIV', 'SPAN',
])

export function sanitizeHtml(input: string): string {
  let html = input

  // 1) script/style 블록 통째 제거
  html = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
  html = html.replace(/<\/?(script|style)[^>]*>/gi, '')

  // 2) on* 이벤트 핸들러 속성 제거 (큰따옴표/작은따옴표/따옴표 없음)
  html = html
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')

  // 3) javascript: URL 무력화
  html = html.replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"')

  // 4) 허용되지 않은 태그 제거 (여는/닫는 태그명만 검사, 내용은 보존)
  html = html.replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g, (m, tag) =>
    ALLOWED.has(String(tag).toUpperCase()) ? m : ''
  )

  return html
}

// HTML → 평문(검색/폴백용). 태그 제거 후 공백 정리.
export function htmlToText(input: string): string {
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
