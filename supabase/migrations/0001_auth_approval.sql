-- ============================================================
-- 0001 — 승인제 가입(status) 레이어
-- schema.sql 이 이미 적용된 DB 위에 증분 실행한다.
-- Supabase SQL Editor에서 순서대로 실행하세요.
-- ============================================================

-- ============================================================
-- 1. 가입 상태 ENUM + users 컬럼
-- ============================================================
create type user_status as enum ('pending', 'approved', 'suspended');

alter table users
  add column status      user_status not null default 'pending',
  add column approved_at timestamptz,
  add column approved_by uuid references users(id);


-- ============================================================
-- 2. 신규 가입 트리거 교체
--    권한 상승 방지: 자가 신고 role 무시 → 항상 teacher + pending
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into users (id, name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'teacher',
    'pending'
  );
  return new;
end;
$$;


-- ============================================================
-- 3. 승인 게이트 헬퍼
-- ============================================================

-- 현재 유저가 승인 상태인지
create or replace function is_approved()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from users
    where id = auth.uid() and status = 'approved'
  );
$$;

-- admin 판정에 승인 조건 추가 (정지된 원장은 권한 무효)
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from users
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

-- 담당 강사 판정에 승인 조건 추가
-- → 이 헬퍼를 쓰는 모든 도메인 정책(class_students, attendance, daily_tests,
--   weekly_tests, weekly_test_scores, exams, exam_scores, progress, homework,
--   homework_status, notification_log)이 한 번에 게이팅된다.
create or replace function is_teacher_of_class(p_class_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select is_approved() and exists (
    select 1 from classes
    where id = p_class_id and teacher_id = auth.uid()
  );
$$;


-- ============================================================
-- 4. 헬퍼를 거치지 않는 teacher 정책 재생성 (승인 게이트 주입)
-- ============================================================

-- classes: 기존 "teacher: 본인 담당 반"
drop policy if exists "teacher: 본인 담당 반" on classes;
create policy "teacher: 본인 담당 반"
  on classes for all to authenticated
  using  (teacher_id = auth.uid() and is_approved())
  with check (teacher_id = auth.uid() and is_approved());

-- students: 기존 "teacher: 담당 반 소속 학생"
drop policy if exists "teacher: 담당 반 소속 학생" on students;
create policy "teacher: 담당 반 소속 학생"
  on students for all to authenticated
  using (
    is_approved() and exists (
      select 1
      from class_students cs
      join classes c on cs.class_id = c.id
      where cs.student_id = students.id
        and c.teacher_id  = auth.uid()
    )
  )
  with check (is_approved());


-- ============================================================
-- 5. 최초 원장(admin) 시드
--    한 계정으로 /signup 가입(→ teacher/pending) 후, 아래 UPDATE 실행.
--    '원장이메일@example.com' 을 실제 이메일로 바꾸세요.
-- ============================================================
-- update users
--   set role = 'admin', status = 'approved', approved_at = now()
--   where email = '원장이메일@example.com';
