# 강사별 세부 권한 (Teacher Permissions) — 설계

날짜: 2026-06-13
상태: 승인됨 (구현 대기)

## 배경 / 목적

현재 권한 모델은 `users.role`(admin/teacher) 2단계뿐이라, "승인된 강사면 담당 반의 출석·성적·진도·숙제를 전부 관리"하는 식으로 거칠다. 원장이 강사마다 특정 기능을 켜고/끌 수 있게 하여 업무 분담(예: 출석만 보는 보조강사, 성적 입력은 못 하는 강사 등)을 가능하게 한다.

강사는 외부인이 아닌 **내부 직원**이므로, 악의적 우회에 대한 강한 보안보다 **워크플로 통제**가 목적이다. 따라서 강제는 앱(서버 액션 + UI) 레벨을 기본으로 하고, 읽기 범위를 넓히는 '다른 반 조회'만 RLS로 처리한다. 기존 RLS(담당 반 한정, 학생 PII 마스킹, 원장 전용 작업)는 그대로 보안 경계를 유지한다.

## 권한 목록과 기본값

`users.permissions` (jsonb)에 boolean 키로 저장한다. 빈 `{}`이면 헬퍼가 아래 기본값을 적용한다 → 기존 강사는 마이그레이션 후에도 기본값대로 동작.

| 키 | 의미 | 기본값 | 비고 |
|---|---|---|---|
| `attendance` | 출석 관리 | ON | 끄면 출석 탭 읽기전용 |
| `scores` | 성적 입력 | ON | 끄면 성적 탭 읽기전용 |
| `progress` | 진도 입력 | ON | 끄면 진도 탭 읽기전용 |
| `homework` | 숙제 관리 | ON | 끄면 숙제 탭 숨김/읽기전용 |
| `materials_upload` | 자료실 업로드 | ON | 끄면 자료실 조회만 |
| `messaging` | 메시지 발송 | ON | 기존엔 원장 전용 → 기본 ON이라 기존 강사 전원이 새로 획득 |
| `view_all_classes` | 다른 반 조회 | OFF | 켜면 전 반 명단/현황 조회 |

원장(admin)은 권한 체크를 항상 통과한다(전부 허용).

## 아키텍처

### 데이터 모델 (마이그레이션 `0013_teacher_permissions.sql`)
- `alter table users add column if not exists permissions jsonb not null default '{}'::jsonb`.
- `SECURITY DEFINER` 함수 `has_permission(uid uuid, key text) returns boolean`: 대상 user의 role='admin'이면 true; 아니면 `permissions->>key`를 읽되 NULL이면 위 기본값 적용. RLS와 앱에서 일관된 판정을 위해 기본값을 함수에도 반영.
- '다른 반 조회' RLS: `students_view` 및 classes/attendance/tests/progress의 강사 SELECT 정책에 `OR has_permission(auth.uid(), 'view_all_classes')`를 추가. (정확한 정책 이름/대상 테이블은 계획 단계에서 기존 정책을 확인해 확정.)
- 자가수정 차단: `users`에 강사 self-update 정책이 존재하면 `permissions` 컬럼 변경을 막는 트리거 가드(`guard_user_permissions` 등)를 추가해 원장만 변경 가능하게 한다. self-update 정책이 없으면 불필요(계획 단계에서 확인).
- **graceful**: 0013 미적용이어도 앱이 크래시하지 않아야 한다 — `permissions` 조회 실패/부재 시 기본값 맵으로 폴백.

### 권한 라이브러리 (`src/lib/permissions.ts`)
- `PERMISSION_KEYS` 상수 배열 + 각 키의 라벨/설명.
- `DEFAULT_PERMISSIONS: Record<Key, boolean>` (위 표).
- `resolvePermissions(raw)`: jsonb(또는 undefined)를 받아 기본값과 머지한 완전한 맵 반환.
- `hasPermission(profile, key)`: role==='admin'이면 true, 아니면 resolve 후 키 조회.

### 권한 강제 (앱 레벨)
- `src/lib/auth.ts`에 `requirePermission(key)` 추가: 세션 profile(permissions 포함)을 읽어 `hasPermission` false면 throw. `getSessionProfile`의 select에 `permissions` 추가.
- 적용 액션 진입부:
  - `attendance.ts` → `attendance`
  - `tests.ts` (성적 입력/수정) → `scores`
  - `progress.ts` → `progress`
  - `homework.ts`(생성/채점) + `notify.ts`(미제출 알림) → `homework`
  - `materials.ts`(생성) → `materials_upload`
  - `messages.ts`(sendTargetedMessage) → `messaging`
  - 단, 원장 전용 액션은 기존 `requireAdmin` 유지(권한 체크 불필요).

### UI 게이팅
- 서버 컴포넌트에서 `profile.permissions`를 resolve해 자식에 내려줌.
- ClassTabs / 각 탭 페이지: 해당 권한 없으면 탭을 숨기거나(숙제) 보드를 읽기전용으로(출석/성적/진도) 렌더. 읽기전용 = 저장 버튼/입력 비활성.
- 자료실: 업로드 권한 없으면 등록 버튼/모달 숨김(조회·다운로드는 유지).
- 메시지: 권한 없으면 사이드바 '메시지 발송' 항목 및 발송 UI 숨김. (현재 nav의 메시지 발송은 adminOnly 그룹에 있으므로, 강사 노출 위치는 계획 단계에서 정함 — adminOnly 분리 필요.)

### 강사관리 페이지 UI (`/admin/teachers`)
- '승인됨' 섹션의 각 강사 행에 **"권한 설정"** 버튼 추가(pending/suspended는 미노출).
- `TeacherPermissionsModal`(client): 7개 토글 스위치(라벨/설명은 permissions.ts에서), 저장/취소. 현재 값은 서버에서 resolve해 prop으로 전달.
- 저장 액션 `updateTeacherPermissions(formData)` (admin.ts): `requireAdmin` → 폼의 boolean들을 모아 `users.permissions` jsonb 업데이트(대상 role='teacher' 한정) → `revalidatePath('/admin/teachers')`.

## 데이터 흐름
1. 원장이 강사관리 → "권한 설정" → 모달에서 토글 → 저장 → `updateTeacherPermissions` → users.permissions 갱신.
2. 강사가 로그인 → 서버 컴포넌트가 profile.permissions resolve → UI에서 탭/버튼 노출 여부 결정.
3. 강사가 액션 호출(예: 출석 저장) → `requirePermission('attendance')`가 서버에서 재검증 → 통과 시 RLS(담당 반)도 통과해 수행.
4. '다른 반 조회'가 켜진 강사 → RLS의 `has_permission(...,'view_all_classes')` 분기로 전 반 SELECT 허용.

## 에러 처리
- 권한 없는 액션 호출: throw → 기존 액션 에러 처리 패턴(폼 에러/토스트) 재사용.
- 0013 미적용: permissions 부재 → 기본값 폴백, 크래시 없음. `has_permission` 함수 부재 시 RLS 정책은 0013 적용 후에만 추가되므로 영향 없음(미적용 상태에선 기존 정책 그대로).

## 테스트 / 검증
- tsc + next build 통과.
- 수동: 원장으로 특정 강사의 출석/메시지 권한 OFF → 해당 강사 로그인 시 출석 탭 읽기전용, 메시지 메뉴 숨김 확인. view_all_classes ON 시 타 반 조회 가능 확인(0013 적용 후).

## 범위 제외 (YAGNI)
- 권한 변경 이력/감사 로그
- 권한 프리셋/템플릿
- 반별로 다른 권한(반 단위 세분화)
- 권한별 알림

## 결정 요약
- 강제 위치: 앱 레벨(서버 액션 + UI) 기본, '다른 반 조회'만 RLS.
- 저장 형태: `users.permissions` jsonb 단일 컬럼(확장 용이).
- 기본값: 운영 4종 + 자료실 + 메시지 ON, 다른 반 조회 OFF (= 메시지 제외하면 기존 동작 유지, 메시지는 의도적으로 전 강사 개방).
