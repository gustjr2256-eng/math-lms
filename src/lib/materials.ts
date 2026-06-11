// 자료실 분류 상수 — 서버 액션/클라이언트 컴포넌트가 공유한다.

export const SCHOOL_LEVELS = ['중등부', '고등부'] as const
export type SchoolLevel = (typeof SCHOOL_LEVELS)[number]

export const CATEGORIES = ['내신대비', '모의고사', '개념교재', '오답노트'] as const
export type Category = (typeof CATEGORIES)[number]

// 대분류별 학년 (중등부↔중1~3 / 고등부↔고1~3)
export const GRADES_BY_LEVEL: Record<SchoolLevel, readonly string[]> = {
  중등부: ['중1', '중2', '중3'],
  고등부: ['고1', '고2', '고3'],
}

export type Grade = '중1' | '중2' | '중3' | '고1' | '고2' | '고3'

// grade로 대분류 역추론
export function levelOfGrade(grade: string): SchoolLevel {
  return grade.startsWith('중') ? '중등부' : '고등부'
}

export type Material = {
  id: string
  title: string
  description: string | null
  school_level: SchoolLevel
  grade: Grade
  category: Category
  file_path: string
  file_name: string
  file_size: number
  created_by: string | null
  created_at: string
  uploader: { name: string } | { name: string }[] | null
}

// 사람이 읽기 좋은 파일 크기
export function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)}${units[i]}`
}
