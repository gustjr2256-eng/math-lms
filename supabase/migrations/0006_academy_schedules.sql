-- ============================================================
-- 0006 — 학원 캘린더 (기간제 일정 + 특정일 일정)
-- 0005 적용 이후 실행.
-- 승인된 강사/원장 공용 일정. 학생은 계정이 없어 접근 불가.
-- ============================================================

-- ============================================================
-- 1. 일정 유형 ENUM
--    period = 기간제 배경 블록 (예: 기말고사 대비 2~20일)
--    single = 단일 특정일 (예: 5일 수학 시험일)
-- ============================================================
create type schedule_type as enum ('period', 'single');


-- ============================================================
-- 2. academy_schedules 테이블
--    color 는 프리셋 키(rose/amber/...)를 저장한다.
--    임의 hex 를 저장하면 Tailwind 정적 클래스와 어긋나므로 키로 관리.
-- ============================================================
create table academy_schedules (
  id          uuid           primary key default uuid_generate_v4(),
  title       text           not null,
  type        schedule_type  not null,
  start_date  date           not null,
  end_date    date           not null,   -- single 은 start_date 와 동일하게 저장
  color       text           not null default 'blue',
  memo        text,
  created_by  uuid           references users(id) on delete set null,
  created_at  timestamptz    not null default now(),

  constraint academy_schedules_date_order check (end_date >= start_date)
);

create index on academy_schedules (start_date, end_date);


-- ============================================================
-- 3. RLS — 승인된 강사/원장 공용
--    조회: 승인된 누구나 / 등록: 본인 명의 / 수정·삭제: 작성자 또는 원장
-- ============================================================
alter table academy_schedules enable row level security;

create policy "approved: schedules 조회"
  on academy_schedules for select to authenticated
  using (is_approved());

create policy "approved: schedules 등록"
  on academy_schedules for insert to authenticated
  with check (is_approved() and created_by = auth.uid());

create policy "owner/admin: schedules 수정"
  on academy_schedules for update to authenticated
  using  (is_admin() or created_by = auth.uid())
  with check (is_admin() or created_by = auth.uid());

create policy "owner/admin: schedules 삭제"
  on academy_schedules for delete to authenticated
  using (is_admin() or created_by = auth.uid());
