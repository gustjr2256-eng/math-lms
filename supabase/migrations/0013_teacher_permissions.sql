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
