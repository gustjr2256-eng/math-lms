// 강사별 세부 권한 정의 + resolve/has 헬퍼. 서버·클라 공용(순수 TS).

export const PERMISSION_KEYS = [
  'attendance',
  'scores',
  'progress',
  'homework',
  'materials_upload',
  'messaging',
  'view_all_classes',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export const PERMISSION_LABELS: Record<PermissionKey, { label: string; desc: string }> = {
  attendance: { label: '출석 관리', desc: '담당 반 출석 체크·저장' },
  scores: { label: '성적 입력', desc: '담당 반 시험 성적 입력·수정' },
  progress: { label: '진도 입력', desc: '담당 반 진도 기록' },
  homework: { label: '숙제 관리', desc: '숙제 생성·채점·미제출 알림' },
  materials_upload: { label: '자료실 업로드', desc: '내부 자료실 파일 등록' },
  messaging: { label: '메시지 발송', desc: '학부모·학생에게 문자/알림톡 발송' },
  view_all_classes: { label: '다른 반 조회', desc: '담당이 아닌 반의 명단·현황 조회' },
}

// 빈 {}/미적용 강사가 마이그레이션 후에도 기존과 동일하게 동작하도록 한 기본값.
// 메시지는 의도적으로 전 강사 개방(원장이 개별로 끔). 다른 반 조회만 기본 OFF.
export const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  attendance: true,
  scores: true,
  progress: true,
  homework: true,
  materials_upload: true,
  messaging: true,
  view_all_classes: false,
}

// DB의 jsonb(또는 undefined/null)를 받아 기본값과 머지한 완전한 맵을 반환.
export function resolvePermissions(raw: unknown): Record<PermissionKey, boolean> {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out = { ...DEFAULT_PERMISSIONS }
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') out[key] = obj[key] as boolean
  }
  return out
}

// role/permissions를 가진 profile로 특정 권한 보유 여부 판정. 원장은 항상 true.
export function hasPermission(
  profile: { role?: string | null; permissions?: unknown } | null | undefined,
  key: PermissionKey
): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return true
  return resolvePermissions(profile.permissions)[key]
}
