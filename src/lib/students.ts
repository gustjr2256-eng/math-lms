// 학생 상태 상수 — 서버 액션/클라이언트 컴포넌트 공유.

export const STUDENT_STATUSES = ['NEW', 'ACTIVE', 'DROPPED'] as const
export type StudentStatus = (typeof STUDENT_STATUSES)[number]

export const STATUS_LABEL: Record<StudentStatus, string> = {
  NEW: '신규',
  ACTIVE: '재원',
  DROPPED: '퇴원',
}

// 상태 배지 색상 (Tailwind 정적 클래스)
export const STATUS_BADGE: Record<StudentStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  DROPPED: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

export const STUDENT_GENDERS = ['남', '여'] as const
export type StudentGender = (typeof STUDENT_GENDERS)[number]

export type AdminStudent = {
  id: string
  name: string
  grade: string
  school: string | null
  gender: StudentGender | null
  status: StudentStatus
  class_id: string | null
  student_phone: string | null
  parent_phone: string | null
  memo: string | null
}
