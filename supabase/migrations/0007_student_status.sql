-- ============================================================
-- 0007 — 학생 상태(status) + 권한 분리
-- 0006 적용 이후 실행.
--   - status: NEW(신규) / ACTIVE(재원) / DROPPED(퇴원)
--   - 원장은 전체 학생, 강사는 '담당 반 + ACTIVE'만 조회(쓰기 불가)
--   - 퇴원생/신규생은 강사 화면에서 자동으로 숨겨진다(뷰 한 곳에서 차단).
-- ============================================================

-- ============================================================
-- 1. 상태 ENUM + 컬럼 (기존 학생은 모두 ACTIVE 로 시작)
-- ============================================================
create type student_status as enum ('NEW', 'ACTIVE', 'DROPPED');

alter table students
  add column status student_status not null default 'ACTIVE';

create index on students (status);


-- ============================================================
-- 2. students_view 재정의
--    - status 컬럼 추가
--    - 원장(is_admin)이 아니면 ACTIVE 만 노출
--      → 출석/성적/진도/과제 등 강사용 모든 조회가 이 뷰 하나로
--        퇴원/신규 학생을 자동 제외한다.
-- ============================================================
drop view if exists students_view;
create view students_view
with (security_invoker = on) as
select
  s.id,
  s.name,
  s.grade,
  s.class_id,
  s.status,
  s.memo,
  s.created_at,
  case when is_admin() then s.student_phone else mask_phone(s.student_phone) end as student_phone,
  case when is_admin() then s.parent_phone  else mask_phone(s.parent_phone)  end as parent_phone
from students s
where is_admin() or s.status = 'ACTIVE';

grant select on students_view to authenticated;


-- ============================================================
-- 3. students 강사 정책: '조회 전용 + ACTIVE 한정' 으로 교체
--    기존 FOR ALL(쓰기 포함) 정책을 제거 →
--    학생 등록/수정/삭제/상태변경/반배정은 "admin: students 전체"가 전담(원장 전용).
-- ============================================================
drop policy if exists "teacher: 담당 반 학생" on students;

create policy "teacher: 담당 반 ACTIVE 학생 조회"
  on students for select to authenticated
  using (
    is_approved()
    and status = 'ACTIVE'
    and exists (
      select 1 from classes c
      where c.id = students.class_id and c.teacher_id = auth.uid()
    )
  );
-- INSERT/UPDATE/DELETE 는 기존 "admin: students 전체"(FOR ALL) 정책이 원장에게만 허용.
