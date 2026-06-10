-- ============================================================
-- 0002 — 반(Class) 중심 매칭 + 학생 전화번호 마스킹
-- 0001 적용 이후 실행한다.
-- ============================================================

-- ============================================================
-- 1. 학생 → 단일 반 소속 (students.class_id 직접 FK)
--    요구사항: "한 학생은 특정 반에 소속된다"
--    (기존 class_students 다대다는 이번 단계에서 미사용)
-- ============================================================
alter table students
  add column class_id uuid references classes(id) on delete set null;

create index on students (class_id);


-- ============================================================
-- 2. classes — 강사는 '조회만' (생성/수정/삭제/강사지정은 원장)
-- ============================================================
drop policy if exists "teacher: 본인 담당 반" on classes;
create policy "teacher: 본인 담당 반 조회"
  on classes for select to authenticated
  using (teacher_id = auth.uid() and is_approved());
-- INSERT/UPDATE/DELETE 는 기존 "admin: classes 전체" 정책이 전담.


-- ============================================================
-- 3. students — teacher 정책을 class_id 기반으로 교체
--    (0001에서 class_students 조인으로 만든 정책을 대체)
-- ============================================================
drop policy if exists "teacher: 담당 반 소속 학생" on students;
create policy "teacher: 담당 반 학생"
  on students for all to authenticated
  using (
    is_approved() and exists (
      select 1 from classes c
      where c.id = students.class_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    is_approved() and exists (
      select 1 from classes c
      where c.id = students.class_id and c.teacher_id = auth.uid()
    )
  );


-- ============================================================
-- 4. 전화번호 마스킹 함수 (뒤 4자리만 노출)
--    예) '010-1234-5678' → '*********5678'
-- ============================================================
create or replace function mask_phone(p text)
returns text
language sql
immutable
as $$
  select case
    when p is null or length(p) <= 4 then p
    else regexp_replace(p, '.(?=.{4})', '*', 'g')
  end;
$$;


-- ============================================================
-- 5. 학생 조회용 보안 뷰
--    - security_invoker=on → 베이스 테이블 RLS 그대로 적용
--      (강사는 본인 반 학생만 보임)
--    - 원장(is_admin)만 실제 전화번호, 그 외에는 마스킹
--    앱에서 학생 '조회'는 반드시 이 뷰를 사용한다.
-- ============================================================
create or replace view students_view
with (security_invoker = on) as
select
  s.id,
  s.name,
  s.grade,
  s.class_id,
  s.memo,
  s.created_at,
  case when is_admin() then s.student_phone else mask_phone(s.student_phone) end as student_phone,
  case when is_admin() then s.parent_phone  else mask_phone(s.parent_phone)  end as parent_phone
from students s;

grant select on students_view to authenticated;


-- ============================================================
-- 6. 전화번호 편집 차단 트리거
--    강사가 보낸 전화번호 변경은 DB 차원에서 무시한다(원장만 가능).
-- ============================================================
create or replace function guard_student_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    if tg_op = 'INSERT' then
      new.student_phone := null;
      new.parent_phone  := null;
    elsif tg_op = 'UPDATE' then
      new.student_phone := old.student_phone;
      new.parent_phone  := old.parent_phone;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_student_phone on students;
create trigger trg_guard_student_phone
  before insert or update on students
  for each row execute function guard_student_phone();
