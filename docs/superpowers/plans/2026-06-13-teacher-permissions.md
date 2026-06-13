# 강사별 세부 권한 (Teacher Permissions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원장이 강사마다 7개 기능(출석·성적·진도·숙제·자료실업로드·메시지·다른반조회)을 켜고/끌 수 있게 한다.

**Architecture:** 권한을 `users.permissions`(jsonb)에 저장. 쓰기 기능은 서버 액션의 `requirePermission()` + UI 게이팅(앱 레벨)으로 강제하고, 읽기 범위를 넓히는 '다른 반 조회'만 RLS permissive 정책으로 처리한다. 원장은 항상 통과. 빈 `{}`이면 기본값 맵으로 폴백해 기존 강사 동작을 보존한다.

**Tech Stack:** Next.js 16(App Router, proxy.ts) · @supabase/ssr · PostgreSQL/Supabase RLS · TypeScript.

**검증 방식:** 이 저장소엔 테스트 러너가 없다(기존 단계 모두 `tsc`/`lint`/`build`로 검증). 각 태스크는 `npx tsc --noEmit`(+ 필요 시 `npm run lint`)로 검증하고, 통합 후 `npx next build`와 수동 확인을 한다.

**참고 — 이 코드베이스의 확정 사실(탐색 완료):**
- `getSessionProfile`(`src/lib/auth.ts`)는 `users`에서 `id, name, role, status`를 select 한다. `requireApproved`는 `{ supabase, user, profile, isAdmin }`을, `requireAdmin`은 `{ supabase, user, profile }`을 반환.
- `users` RLS: `admin: users 전체`(for all, is_admin), `teacher: users 본인 조회`(select, id=auth.uid()), **`teacher: users 본인 수정`(update, with check id=auth.uid() and role='teacher')** → 강사가 자기 `permissions`를 바꿀 수 있으므로 가드 트리거 필요.
- 강사 SELECT를 제한하는 정책: classes `teacher: 본인 담당 반`(for all, teacher_id=auth.uid()), students `teacher: 담당 반 ACTIVE 학생 조회`(0007), attendance `teacher: 담당 반 출결`, tests `teacher: 담당 반 시험`/test_scores `teacher: 담당 반 점수`(0003), progress `teacher: 담당 반 진도`. `students_view`는 security_invoker 뷰라 students RLS를 그대로 탄다.
- 헬퍼 함수 `is_admin()`(security definer)이 schema.sql/0001에 존재.
- 액션 진입부: attendance.ts(`saveAttendance`), tests.ts(`createTest`/`saveScores`/`deleteTest`), progress.ts(`addProgress`/`deleteProgress`), homework.ts(`createHomework`/`deleteHomework`/`reviewSubmission`; `submitHomework`는 비로그인이라 제외), notify.ts(`sendNotifications`), materials.ts(`createMaterial`; update/delete/download은 본인/원장 RLS라 제외), messages.ts(`sendTargetedMessage`, 현재 requireAdmin).
- 탭 페이지(`src/app/classes/[id]/{attendance,tests,progress,homework}/page.tsx`)는 모두 `requireApproved()`를 호출하고 보드/폼 컴포넌트를 렌더. ClassTabs(`src/components/classes/ClassTabs.tsx`)는 `isHomeworkEnabled`로 숙제 탭 노출을 제어.
- 보드 컴포넌트: `AttendanceBoard`(저장/전체출석 버튼 + 상태버튼), `ScoreGrid`(점수 input + 저장), `ProgressForm`(추가 폼만; 목록은 page), `TestCreateForm`/`HomeworkForm`/`NotifyPanel`(생성/발송 폼). `MaterialsBrowser`는 `isAdmin` prop + '+ 새 자료 업로드' 버튼(line ~87) + create 모달.
- 메시지 페이지는 `/admin/messages`(proxy가 `/admin/*`를 admin만 통과). `MessageComposer`는 `classes`(id,name)+`students`(students_view ACTIVE) prop. 액션 `sendTargetedMessage`는 service role로 실번호 조회 후 발송.

---

## File Structure

**신규**
- `src/lib/permissions.ts` — 권한 키/라벨/기본값 + resolve/has 헬퍼(순수 TS, 서버·클라 공용).
- `supabase/migrations/0013_teacher_permissions.sql` — 컬럼 + has_permission() + 가드 트리거 + view_all_classes permissive SELECT 정책.
- `src/app/admin/teachers/_components/TeacherPermissionsModal.tsx` — 권한 토글 모달(client).
- `src/app/messages/page.tsx` — 강사·원장 공용 메시지 발송 페이지(권한 게이팅). 기존 `/admin/messages`에서 이동.

**수정**
- `src/lib/auth.ts` — select에 permissions 추가, requireApproved 반환에 permissions, `requirePermission()` 추가.
- 액션 6종 — 진입부에 requirePermission.
- `src/app/actions/messages.ts` — requireAdmin → requirePermission('messaging') + 비원장 반 스코프 검증.
- `src/app/actions/admin.ts` — `updateTeacherPermissions` 추가.
- 탭 페이지 4종 + ClassTabs(layout) — 권한별 읽기전용/탭숨김.
- 보드 2종(AttendanceBoard, ScoreGrid) — `canEdit` prop.
- `src/components/materials/MaterialsBrowser.tsx` + `src/app/materials/page.tsx` + `src/app/clinic/materials/page.tsx` — `canUpload` prop.
- `src/components/layout/nav.ts` — '메시지 발송'을 adminOnly 그룹 → MAIN_NAV로 이동, href `/messages`.
- `src/app/admin/teachers/page.tsx` + `_components/TeacherRowActions.tsx` — 권한 설정 버튼.
- 삭제: `src/app/admin/messages/`(page.tsx, _components는 /messages로 이동).

---

## Task 1: 권한 라이브러리 (`src/lib/permissions.ts`)

**Files:**
- Create: `src/lib/permissions.ts`

- [ ] **Step 1: 파일 작성**

```ts
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
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음(종료 코드 0).

- [ ] **Step 3: 커밋**

```bash
git add src/lib/permissions.ts
git commit -m "feat(perms): 강사 권한 정의/헬퍼 라이브러리 추가"
```

---

## Task 2: auth 통합 (`src/lib/auth.ts`)

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: select에 permissions 추가 + requireApproved 반환 확장 + requirePermission 추가**

`getSessionProfile`의 select 문자열 `'id, name, role, status'`를 `'id, name, role, status, permissions'`로 바꾼다.

`requireApproved`의 return을 아래로 교체:

```ts
  return { supabase, user, profile, isAdmin: profile.role === 'admin' }
```
↓
```ts
  return {
    supabase,
    user,
    profile,
    isAdmin: profile.role === 'admin',
    permissions: resolvePermissions(profile.permissions),
  }
```

파일 상단 import에 추가:

```ts
import { resolvePermissions, hasPermission, type PermissionKey } from '@/lib/permissions'
```

파일 끝에 헬퍼 추가:

```ts
// 특정 권한이 필요한 서버 액션 진입부에서 호출. 원장은 항상 통과.
export async function requirePermission(key: PermissionKey) {
  const ctx = await requireApproved()
  if (!hasPermission(ctx.profile, key)) {
    throw new Error('이 작업에 대한 권한이 없습니다.')
  }
  return ctx
}
```

> 참고: `profile.permissions`가 select 결과에 없을 수 있으나(0013 미적용) `resolvePermissions`가 기본값으로 폴백하므로 안전.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/auth.ts
git commit -m "feat(perms): auth에 permissions resolve + requirePermission 추가"
```

---

## Task 3: 마이그레이션 0013 (DB)

**Files:**
- Create: `supabase/migrations/0013_teacher_permissions.sql`

- [ ] **Step 1: 마이그레이션 작성**

```sql
-- ============================================================
-- 0013 — 강사별 세부 권한 (users.permissions jsonb)
-- 0012 적용 이후 실행. 빈 {} 기본값 → 기존 강사는 앱 헬퍼의 기본값대로 동작.
--   - 쓰기 기능은 앱(서버 액션)에서 강제. 여기선 '다른 반 조회'만 RLS로 연다.
--   - 강사가 자기 permissions 를 못 바꾸도록 트리거로 막는다(self-grant 방지).
-- ============================================================

-- 1. 컬럼
alter table users
  add column if not exists permissions jsonb not null default '{}'::jsonb;

-- 2. 권한 판정 함수(원장은 항상 true). RLS·정책에서 재사용.
--    앱(permissions.ts)의 DEFAULT_PERMISSIONS 와 일관되게: 키가 없으면
--    view_all_classes 만 false, 나머지는 true 로 본다.
create or replace function has_permission(p_uid uuid, p_key text)
returns boolean
language sql
security definer
stable
as $$
  select case
    when exists (select 1 from users where id = p_uid and role = 'admin') then true
    else coalesce(
      (select (permissions ->> p_key)::boolean from users where id = p_uid),
      case when p_key = 'view_all_classes' then false else true end
    )
  end;
$$;

-- 3. self-grant 방지: 원장이 아니면 permissions 변경 금지.
create or replace function guard_user_permissions()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.permissions is distinct from old.permissions and not is_admin() then
    new.permissions := old.permissions;  -- 강사의 permissions 변경을 조용히 무시
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_user_permissions on users;
create trigger trg_guard_user_permissions
  before update on users
  for each row execute function guard_user_permissions();

-- 4. '다른 반 조회' — 기존 for-all/제한 정책은 건드리지 않고 permissive SELECT 정책을 추가.
--    (RLS 정책은 OR 결합되므로 읽기 범위만 넓어지고 쓰기 정책엔 영향 없음)
drop policy if exists "teacher: 전체 반 조회(권한)" on classes;
create policy "teacher: 전체 반 조회(권한)"
  on classes for select to authenticated
  using (has_permission(auth.uid(), 'view_all_classes'));

drop policy if exists "teacher: 전체 학생 조회(권한)" on students;
create policy "teacher: 전체 학생 조회(권한)"
  on students for select to authenticated
  using (status = 'ACTIVE' and has_permission(auth.uid(), 'view_all_classes'));

drop policy if exists "teacher: 전체 출결 조회(권한)" on attendance;
create policy "teacher: 전체 출결 조회(권한)"
  on attendance for select to authenticated
  using (has_permission(auth.uid(), 'view_all_classes'));

drop policy if exists "teacher: 전체 시험 조회(권한)" on tests;
create policy "teacher: 전체 시험 조회(권한)"
  on tests for select to authenticated
  using (has_permission(auth.uid(), 'view_all_classes'));

drop policy if exists "teacher: 전체 점수 조회(권한)" on test_scores;
create policy "teacher: 전체 점수 조회(권한)"
  on test_scores for select to authenticated
  using (has_permission(auth.uid(), 'view_all_classes'));

drop policy if exists "teacher: 전체 진도 조회(권한)" on progress;
create policy "teacher: 전체 진도 조회(권한)"
  on progress for select to authenticated
  using (has_permission(auth.uid(), 'view_all_classes'));
```

> 주의: 이 SQL은 Supabase SQL Editor에서 수동 적용한다(supabase-js로 DDL 불가 — DB 접속 문자열 없음). 미적용이어도 앱은 graceful: `permissions` 컬럼/`has_permission` 부재 시 select는 해당 컬럼만 빠지고 헬퍼가 기본값 폴백, RLS는 기존 정책 그대로라 동작에 지장 없음(다른 반 조회만 비활성).

- [ ] **Step 2: SQL 문법 셀프 점검**

테이블/컬럼명이 실제와 일치하는지 확인: `tests`/`test_scores`(0003), `attendance`/`progress`(schema.sql), `students.status='ACTIVE'`(0007). 일치하면 통과.

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/0013_teacher_permissions.sql
git commit -m "feat(perms): 0013 permissions 컬럼 + has_permission + 가드 + view_all_classes 정책"
```

---

## Task 4: 쓰기 액션 권한 게이팅

각 액션 진입부의 `requireApproved()` 호출을 `requirePermission('<key>')`로 바꾼다(반환 시그니처 동일 — `{ supabase, ... }` 그대로 사용). 원장은 통과한다.

**Files:**
- Modify: `src/app/actions/attendance.ts`, `tests.ts`, `progress.ts`, `homework.ts`, `notify.ts`, `materials.ts`

- [ ] **Step 1: import 교체**

각 파일 상단 `import { requireApproved } from '@/lib/auth'`를 `import { requireApproved, requirePermission } from '@/lib/auth'`로 바꾼다. (homework.ts/notify.ts/materials.ts는 이미 다른 것들과 함께 import 중이므로 `requirePermission`만 추가.)

- [ ] **Step 2: 각 액션의 requireApproved → requirePermission 교체**

- `attendance.ts` `saveAttendance`: `await requireApproved()` → `await requirePermission('attendance')`
- `tests.ts` `createTest`, `saveScores`, `deleteTest`: 각 `requireApproved()` → `requirePermission('scores')`
- `progress.ts` `addProgress`, `deleteProgress`: `requireApproved()` → `requirePermission('progress')`
- `homework.ts` `createHomework`, `deleteHomework`, `reviewSubmission`: `requireApproved()` → `requirePermission('homework')` (단, `submitHomework`는 비로그인 제출이라 **변경 금지**)
- `notify.ts` `sendNotifications`: `requireApproved()` → `requirePermission('homework')` (숙제 미제출 알림은 숙제 권한에 속함)
- `materials.ts` `createMaterial`: `requireApproved()` → `requirePermission('materials_upload')` (update/delete/getMaterialDownloadUrl은 **변경 금지** — 본인/원장 RLS로 보호)

> 주의: 일부 액션은 `let supabase; try { ({ supabase } = await requireApproved()) } catch {...}` 패턴이다. 이 경우 `requireApproved` → `requirePermission('<key>')`로만 바꾸면 된다(구조분해/try-catch 유지).

- [ ] **Step 3: 타입체크 + 빌드**

Run: `npx tsc --noEmit && npx next build`
Expected: 통과(라우트 수 변화 없음).

- [ ] **Step 4: 커밋**

```bash
git add src/app/actions/attendance.ts src/app/actions/tests.ts src/app/actions/progress.ts src/app/actions/homework.ts src/app/actions/notify.ts src/app/actions/materials.ts
git commit -m "feat(perms): 쓰기 액션에 requirePermission 게이팅"
```

---

## Task 5: UI 게이팅 — 탭/보드 읽기전용 + 자료실 업로드

### 5a. ClassTabs 숙제 탭 숨김 (layout)

**Files:**
- Modify: `src/app/classes/[id]/layout.tsx`

- [ ] **Step 1: layout에서 숙제 권한 계산 후 ClassTabs에 전달**

layout이 이미 `requireApproved()`(또는 createClient)로 class_type을 읽어 `isHomeworkEnabled`를 ClassTabs에 넘긴다. 권한을 AND 한다:

```tsx
const { profile, permissions } = await requireApproved()
// ...기존 isClinic 계산...
const homeworkEnabled = !isClinic && (permissions?.homework ?? true)
// <ClassTabs classId={id} isHomeworkEnabled={isHomeworkEnabled} /> 를:
<ClassTabs classId={id} isHomeworkEnabled={homeworkEnabled} />
```

> layout이 `requireApproved`가 아니라 `createClient`를 직접 쓰고 있으면, `import { requireApproved } from '@/lib/auth'`로 바꾸고 profile/permissions를 받는다(파일을 먼저 읽어 기존 패턴 확인 후 적용).

### 5b. AttendanceBoard / ScoreGrid 읽기전용 prop

**Files:**
- Modify: `src/components/classes/AttendanceBoard.tsx`, `src/components/classes/ScoreGrid.tsx`

- [ ] **Step 2: AttendanceBoard에 `canEdit` 추가**

props 타입에 `canEdit?: boolean` 추가, 구조분해에 `canEdit = true`. 그리고:
- '전체 출석' 버튼과 '저장' 버튼을 `{canEdit && ( ... )}`로 감싼다.
- 상태 버튼 `<button ... onClick={...}>` 에 `disabled={!canEdit}` 추가하고 `onClick`을 `canEdit ? () => setMarks(...) : undefined`로.
- 헤더 우측 영역에 `{!canEdit && <span className="text-xs text-brand/50 dark:text-zinc-400">읽기 전용</span>}` 표시.

- [ ] **Step 3: ScoreGrid에 `canEdit` 추가**

props에 `canEdit?: boolean`(기본 true). '점수 저장' 버튼을 `{canEdit && (...)}`로 감싸고, 점수 `<input>`에 `disabled={!canEdit}` + `readOnly={!canEdit}` 추가.

### 5c. 탭 페이지에서 canEdit 계산 + 생성폼 조건부 렌더

**Files:**
- Modify: `src/app/classes/[id]/attendance/page.tsx`, `tests/page.tsx`, `progress/page.tsx`, `homework/page.tsx`

- [ ] **Step 4: 각 페이지에서 permissions 받아 전달**

각 페이지의 `const { supabase } = await requireApproved()`를 `const { supabase, permissions } = await requireApproved()`로 바꾸고:

- attendance/page: `<AttendanceBoard ... canEdit={permissions.attendance} />`
- tests/page: `<TestCreateForm ... />`를 `{permissions.scores && <TestCreateForm classId={id} />}`로 감싸고, `<ScoreGrid ... />`에 `canEdit={permissions.scores}` 추가.
- progress/page: `<ProgressForm ... />`를 `{permissions.progress && <ProgressForm classId={id} today={today} />}`로 감싼다. (목록은 그대로 노출 — 읽기 허용)
- homework/page: 숙제 권한 없으면 layout에서 탭이 이미 숨지만, 직접 URL 접근 방어로 페이지 상단에서 `if (!permissions.homework) redirect(\`/classes/${id}\`)` 추가(`import { redirect } from 'next/navigation'`). 또는 `<HomeworkForm/>`·`<NotifyPanel/>`·채점 버튼을 `{permissions.homework && ...}`로 감싼다. → **redirect 방식 채택**(가장 단순).

### 5d. 자료실 업로드 게이팅

**Files:**
- Modify: `src/components/materials/MaterialsBrowser.tsx`, `src/app/materials/page.tsx`, `src/app/clinic/materials/page.tsx`

- [ ] **Step 5: MaterialsBrowser에 `canUpload` prop**

props에 `canUpload?: boolean`(기본 true). '+ 새 자료 업로드' 버튼을 `{canUpload && ( ... )}`로 감싸고, create 모달 렌더 조건 `{creating && ...}`을 `{creating && canUpload && ...}`로 바꾼다.

materials/page.tsx, clinic/materials/page.tsx에서 `requireApproved()`로 `permissions`를 받아 `<MaterialsBrowser ... canUpload={permissions.materials_upload} />` 전달. (페이지가 `isAdmin`을 이미 넘기고 있으니 같은 자리에서 받음.)

- [ ] **Step 6: 타입체크 + 빌드 + 커밋**

Run: `npx tsc --noEmit && npx next build`
Expected: 통과.

```bash
git add src/app/classes/[id] src/components/classes/AttendanceBoard.tsx src/components/classes/ScoreGrid.tsx src/components/materials/MaterialsBrowser.tsx src/app/materials/page.tsx src/app/clinic/materials/page.tsx
git commit -m "feat(perms): 탭 읽기전용/숙제탭 숨김/자료실 업로드 UI 게이팅"
```

---

## Task 6: 메시지 발송 권한 + /messages 라우트 이동

### 6a. 액션 게이팅 + 비원장 반 스코프 검증

**Files:**
- Modify: `src/app/actions/messages.ts`

- [ ] **Step 1: requireAdmin → requirePermission('messaging') + 스코프 검증**

상단 import: `import { requireAdmin } from '@/lib/auth'` → `import { requirePermission } from '@/lib/auth'`.

`sendTargetedMessage` 내부 `const ctx = await requireAdmin()`를 `const ctx = await requirePermission('messaging')`로 바꾼다. `ctx`는 `{ supabase, user, profile, isAdmin }`를 포함.

studentIds/message 검증 직후, 비원장이면 **요청한 학생이 본인 담당 반 소속인지** RLS로 검증하는 코드를 추가(원장은 전체 허용 유지):

```ts
  // 비원장은 담당 반(ACTIVE) 학생에게만 발송 가능 — 사용자 컨텍스트 RLS로 스코프 강제.
  if (!ctx.isAdmin) {
    const { data: allowed } = await supabase
      .from('students')
      .select('id')
      .in('id', input.studentIds)
    const allowedIds = new Set((allowed ?? []).map((s) => s.id))
    if (input.studentIds.some((id) => !allowedIds.has(id))) {
      return { ok: false, error: '담당 반 학생에게만 발송할 수 있습니다.' }
    }
  }
```

> 원리: 강사 컨텍스트의 `supabase`는 RLS상 본인 담당 반 ACTIVE 학생만 SELECT 된다(0007 정책). 따라서 요청 id 중 조회 안 되는 게 있으면 타 반 학생 → 거부. 실번호 조회는 기존대로 service role(`admin`)로 한다.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과.

### 6b. 라우트 이동 /admin/messages → /messages

**Files:**
- Create: `src/app/messages/page.tsx`, `src/app/messages/_components/` (기존 _components 이동)
- Delete: `src/app/admin/messages/`

- [ ] **Step 3: _components 폴더 이동**

```bash
git mv src/app/admin/messages/_components src/app/messages/_components
```

- [ ] **Step 4: 새 페이지 작성 (`src/app/messages/page.tsx`)**

```tsx
import { redirect } from 'next/navigation'
import { requireApproved } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { AppShell } from '@/components/layout/AppShell'
import { MessageComposer, type ComposerClass, type ComposerStudent } from './_components/MessageComposer'

// 메시지 발송. 원장 + 'messaging' 권한 강사 접근. 강사는 RLS상 담당 반 학생만 조회된다.
export default async function MessagesPage() {
  const { supabase, profile, isAdmin } = await requireApproved()
  if (!hasPermission(profile, 'messaging')) redirect('/dashboard')

  const { data: classes } = await supabase.from('classes').select('id, name').order('name')
  const { data: students } = await supabase
    .from('students_view')
    .select('id, name, grade, class_id, status')
    .order('name')

  const active = ((students ?? []) as ComposerStudent[]).filter((s) => s.status === 'ACTIVE')

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">메시지 발송</h1>
      <p className="mt-2 font-pretendard text-sm text-brand/70 dark:text-zinc-400">
        학생을 선택해 문자(SMS) 또는 알림톡을 보냅니다. 번호는 화면에 노출되지 않으며 발송 시
        서버에서 안전하게 조회됩니다.
      </p>
      <MessageComposer classes={(classes ?? []) as ComposerClass[]} students={active} />
    </AppShell>
  )
}
```

> `AdminGuard`는 제거(권한 게이팅이 대체). 기존 `/admin/messages/page.tsx`는 git mv 후 폴더가 비므로 삭제됨.

- [ ] **Step 5: 기존 admin/messages 잔여 제거 확인**

```bash
git rm -r --ignore-unmatch src/app/admin/messages
```
(이미 _components가 mv되고 page는 새 위치라, admin/messages가 비었으면 제거.)

### 6c. nav 이동

**Files:**
- Modify: `src/components/layout/nav.ts`

- [ ] **Step 6: '메시지 발송'을 adminOnly 그룹에서 MAIN_NAV로**

`NAV_GROUPS`의 '원장 통합 관리' children에서 `{ href: '/admin/messages', label: '메시지 발송', icon: '✉️' }` 줄을 삭제하고, `MAIN_NAV`에 추가:

```ts
export const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: '🏠' },
  { href: '/messages', label: '메시지 발송', icon: '✉️' },
]
```

> messaging 기본 ON이라 거의 모든 강사에게 보인다. 권한이 꺼진 강사가 클릭하면 페이지가 `/dashboard`로 redirect(메뉴 단위 숨김은 범위 외 — 추후 권한 prop 배선 시 가능).

- [ ] **Step 7: 타입체크 + 빌드 + 커밋**

Run: `npx tsc --noEmit && npx next build`
Expected: 통과. 라우트 목록에서 `/admin/messages` 사라지고 `/messages` 생성 확인.

```bash
git add -A
git commit -m "feat(perms): 메시지 발송 권한화 + /messages 라우트 이동 + 강사 반 스코프"
```

---

## Task 7: 강사관리 권한 설정 UI + 저장 액션

### 7a. 저장 액션

**Files:**
- Modify: `src/app/actions/admin.ts`

- [ ] **Step 1: updateTeacherPermissions 추가**

`admin.ts` 상단 import에 추가: `import { PERMISSION_KEYS } from '@/lib/permissions'`.

파일 끝에 추가:

```ts
// 강사 권한 저장(원장 전용). 폼의 각 키 체크박스 값을 모아 users.permissions(jsonb) 갱신.
export async function updateTeacherPermissions(formData: FormData) {
  const { supabase } = await assertAdmin()
  const userId = requireUserId(formData)

  const permissions: Record<string, boolean> = {}
  for (const key of PERMISSION_KEYS) {
    permissions[key] = formData.get(key) === 'on'
  }

  const { error } = await supabase
    .from('users')
    .update({ permissions })
    .eq('id', userId)
    .eq('role', 'teacher')
  if (error) throw new Error(error.message)

  revalidatePath('/admin/teachers')
}
```

> `assertAdmin`이 원장임을 보장하므로 가드 트리거(`guard_user_permissions`)가 통과시킨다.

### 7b. 권한 모달 컴포넌트

**Files:**
- Create: `src/app/admin/teachers/_components/TeacherPermissionsModal.tsx`

- [ ] **Step 2: 모달 작성**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateTeacherPermissions } from '@/app/actions/admin'
import { PERMISSION_KEYS, PERMISSION_LABELS, type PermissionKey } from '@/lib/permissions'

export function TeacherPermissionsModal({
  userId,
  name,
  current,
  onClose,
}: {
  userId: string
  name: string
  current: Record<PermissionKey, boolean>
  onClose: () => void
}) {
  const [vals, setVals] = useState<Record<PermissionKey, boolean>>(current)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const submit = () => {
    setErr(null)
    const fd = new FormData()
    fd.set('userId', userId)
    for (const key of PERMISSION_KEYS) if (vals[key]) fd.set(key, 'on')
    startTransition(async () => {
      try {
        await updateTeacherPermissions(fd)
        onClose()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-cream-line bg-cream-card p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-paperozi text-lg font-bold text-brand dark:text-zinc-50">
          {name} · 권한 설정
        </h2>
        <ul className="mt-4 flex flex-col gap-1">
          {PERMISSION_KEYS.map((key) => (
            <li key={key}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-brand-tint dark:hover:bg-zinc-900">
                <input
                  type="checkbox"
                  checked={vals[key]}
                  onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.checked }))}
                  className="mt-1 h-4 w-4 accent-brand dark:accent-gold"
                />
                <span>
                  <span className="block text-sm font-medium text-brand dark:text-zinc-100">
                    {PERMISSION_LABELS[key].label}
                  </span>
                  <span className="block text-xs text-brand/60 dark:text-zinc-400">
                    {PERMISSION_LABELS[key].desc}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        {err && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-cream-line px-4 text-sm text-brand dark:border-zinc-700 dark:text-zinc-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-gold dark:text-[#0a192f]"
          >
            {pending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 7c. 강사관리 페이지에 '권한 설정' 버튼 배선

**Files:**
- Modify: `src/app/admin/teachers/page.tsx`, `src/app/admin/teachers/_components/TeacherRowActions.tsx`

- [ ] **Step 3: page에서 permissions를 행에 전달**

`page.tsx`의 teacher select에 permissions 추가: `'id, name, email, status, created_at'` → `'id, name, email, status, created_at, permissions'`. `Teacher` 타입에 `permissions?: unknown` 추가. 그리고 행 렌더에서 `<TeacherRowActions userId={t.id} status={t.status} />`를 승인됨일 때만 권한 버튼이 나오도록 permissions/name 전달:

```tsx
<TeacherRowActions
  userId={t.id}
  status={t.status}
  name={t.name}
  permissions={resolvePermissions(t.permissions)}
/>
```

`page.tsx` 상단 import에 `import { resolvePermissions } from '@/lib/permissions'` 추가.

- [ ] **Step 4: TeacherRowActions에 권한 버튼 + 모달**

`TeacherRowActions.tsx`를 client로 유지(이미 client일 것). props에 `name: string`, `permissions: Record<PermissionKey, boolean>` 추가. 컴포넌트에 `const [permОpen, setPermOpen] = useState(false)` 상태와, status==='approved'일 때 보이는 '권한 설정' 버튼 + 모달 렌더 추가:

```tsx
{status === 'approved' && (
  <>
    <button
      type="button"
      onClick={() => setPermOpen(true)}
      className="h-8 rounded-lg border border-cream-line px-3 text-xs font-medium text-brand hover:bg-brand-tint dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      권한 설정
    </button>
    {permOpen && (
      <TeacherPermissionsModal
        userId={userId}
        name={name}
        current={permissions}
        onClose={() => setPermOpen(false)}
      />
    )}
  </>
)}
```

상단 import: `import { TeacherPermissionsModal } from './TeacherPermissionsModal'`, `import { type PermissionKey } from '@/lib/permissions'`, 그리고 `useState`가 없으면 추가.

> TeacherRowActions의 현재 구조(버튼 묶음 위치)는 파일을 먼저 읽어 기존 버튼들 옆에 자연스럽게 끼운다.

- [ ] **Step 5: 타입체크 + 빌드**

Run: `npx tsc --noEmit && npx next build`
Expected: 통과.

- [ ] **Step 6: 커밋**

```bash
git add src/app/actions/admin.ts src/app/admin/teachers
git commit -m "feat(perms): 강사관리에 권한 설정 모달 + 저장 액션"
```

---

## Task 8: 통합 검증 + 메모리 기록

- [ ] **Step 1: 전체 빌드 + 린트**

Run: `npx tsc --noEmit && npm run lint && npx next build`
Expected: 모두 통과. 라우트에 `/messages` 존재, `/admin/messages` 없음.

- [ ] **Step 2: 수동 검증(dev 서버)**

`npm run dev` 후 원장(owner@mathlms.dev / MathLMS!2026) 로그인:
1. 강사관리 → 승인된 강사 '권한 설정' → 출석/메시지 OFF 저장.
2. (0013 적용 시) 해당 강사로 로그인 → 반 출석 탭이 '읽기 전용'(버튼 비활성), 사이드바 메시지 클릭 시 /messages가 대시보드로 redirect 확인.
3. view_all_classes ON → 강사가 /classes에서 타 반도 보이는지 확인.

> 0013 미적용 환경이면 권한 저장/조회는 동작하나 '다른 반 조회' RLS는 미반영(graceful). SQL Editor에서 0013 적용 후 재확인.

- [ ] **Step 3: 메모리 기록**

`math-lms-auth.md`에 '단계 25 = 강사별 세부 권한' 항목 추가(7개 권한·앱레벨강제+view_all RLS·0013·guard 트리거·/messages 이동). MEMORY.md는 변경 없음(이미 math-lms-auth 포인터 존재).

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "docs(perms): 단계 25 강사 권한 메모리 기록"
```

---

## Self-Review (작성자 체크 완료)

- **Spec 커버리지:** 7개 권한 모두 매핑됨(Task 4 쓰기 6종 + Task 6 messaging + Task 3 view_all_classes RLS). 데이터모델(Task 3), 라이브러리(Task 1), auth(Task 2), UI게이팅(Task 5), 강사관리 모달(Task 7), graceful/미적용(각 주의문), self-grant 차단(Task 3 트리거) 모두 포함.
- **플레이스홀더:** 없음. 코드 스텝은 실제 코드 포함. layout/TeacherRowActions처럼 기존 구조 의존 부분은 "먼저 읽고 패턴대로" 명시(파일 변형이 다양해 안전).
- **타입 일관성:** `PermissionKey`/`resolvePermissions`/`hasPermission`/`requirePermission`/`DEFAULT_PERMISSIONS` 이름이 Task 1 정의와 이후 사용처에서 일치. 액션 반환 시그니처(`{ supabase, ... }`) 불변이라 호출부 안전.
- **범위:** 단일 기능(강사 권한)으로 응집. 메뉴 단위 권한 숨김(메시지)·전면 RLS는 의도적으로 제외(spec과 일치).
