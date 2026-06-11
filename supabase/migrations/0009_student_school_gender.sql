-- ============================================================
-- 0009 — 학생에 학교(school) · 성별(gender) 추가
-- 0008 적용 이후 실행. (0007 의 students_view 를 확장 재정의)
-- ============================================================

create type student_gender as enum ('남', '여');

alter table students
  add column school text,
  add column gender student_gender;

create index on students (school);


-- students_view 재정의 — school/gender 노출 추가 (마스킹/필터 규칙은 유지)
drop view if exists students_view;
create view students_view
with (security_invoker = on) as
select
  s.id,
  s.name,
  s.grade,
  s.school,
  s.gender,
  s.class_id,
  s.status,
  s.memo,
  s.created_at,
  case when is_admin() then s.student_phone else mask_phone(s.student_phone) end as student_phone,
  case when is_admin() then s.parent_phone  else mask_phone(s.parent_phone)  end as parent_phone
from students s
where is_admin() or s.status = 'ACTIVE';

grant select on students_view to authenticated;
