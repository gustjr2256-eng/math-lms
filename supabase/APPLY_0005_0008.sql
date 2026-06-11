-- ============================================================
-- 미적용 마이그레이션 합본: 0005 ~ 0008
-- Supabase 대시보드 → SQL Editor 에 전체 붙여넣고 한 번에 Run.
-- (0001~0004 는 이미 적용됨)
-- ============================================================

-- ============================================================
-- 0005 — 강사·원장 전용 내부 자료실 (Materials)
-- 0004 적용 이후 실행.
-- 학생은 인증 계정이 없으므로 구조적으로 접근 불가.
-- 승인된 강사/원장만 RLS로 통과한다.
-- ============================================================

-- ============================================================
-- 1. 분류용 ENUM
-- ============================================================
create type material_school_level as enum ('중등부', '고등부');
create type material_grade        as enum ('중1', '중2', '중3', '고1', '고2', '고3');
create type material_category     as enum ('내신대비', '모의고사', '개념교재', '오답노트');


-- ============================================================
-- 2. materials 테이블
--    파일 자체는 비공개 Storage 버킷에 두고, 여기엔 경로/메타만 기록.
--    file_path = 'materials' 버킷 내 오브젝트 키 (다운로드 시 서명 URL 발급).
-- ============================================================
create table materials (
  id            uuid                   primary key default uuid_generate_v4(),
  title         text                   not null,
  description   text,
  school_level  material_school_level  not null,
  grade         material_grade         not null,
  category      material_category      not null,
  file_path     text                   not null,
  file_name     text                   not null,   -- 원본 파일명
  file_size     bigint                 not null default 0,
  created_by    uuid                   references users(id) on delete set null,
  created_at    timestamptz            not null default now(),

  -- 대분류와 학년의 정합성 보장 (중등부↔중1~3 / 고등부↔고1~3)
  constraint materials_level_grade_match check (
    (school_level = '중등부' and grade in ('중1', '중2', '중3')) or
    (school_level = '고등부' and grade in ('고1', '고2', '고3'))
  )
);

create index on materials (school_level, grade, category);
create index on materials (created_by);


-- ============================================================
-- 3. RLS — 승인된 강사/원장 전용
--    조회: 승인된 누구나(자료실은 강사 공유 공간)
--    등록: 본인 명의(created_by = auth.uid())로만
--    수정/삭제: 작성 본인 또는 원장
-- ============================================================
alter table materials enable row level security;

create policy "approved: materials 조회"
  on materials for select to authenticated
  using (is_approved());

create policy "approved: materials 등록"
  on materials for insert to authenticated
  with check (is_approved() and created_by = auth.uid());

create policy "owner/admin: materials 수정"
  on materials for update to authenticated
  using  (is_admin() or created_by = auth.uid())
  with check (is_admin() or created_by = auth.uid());

create policy "owner/admin: materials 삭제"
  on materials for delete to authenticated
  using (is_admin() or created_by = auth.uid());


-- ============================================================
-- 4. Storage 버킷 (비공개)
--    업로드/서명 URL 발급은 서버의 service role 이 담당하므로
--    storage.objects 에 별도 정책을 두지 않는다(공개 노출 0).
--    SQL Editor에서 막히면 대시보드에서 'materials' (Public 끔) 버킷 수동 생성.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;


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


-- ============================================================
-- 0008 — 원장 공지 + 메인 팝업
-- 0007 적용 이후 실행.
-- 공지는 승인된 강사/원장 모두가 보고(팝업/종), 작성·수정·삭제는 원장 전용.
-- ============================================================

create table announcements (
  id          uuid        primary key default uuid_generate_v4(),
  title       text        not null,
  body        text        not null,
  image_url   text,                         -- 공지 팝업 이미지(공개 버킷 URL)
  active      boolean     not null default true,
  created_by  uuid        references users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index on announcements (active, created_at desc);


-- ============================================================
-- RLS — 조회는 승인자 전체 / 작성·수정·삭제는 원장
-- ============================================================
alter table announcements enable row level security;

create policy "approved: announcements 조회"
  on announcements for select to authenticated
  using (is_approved());

create policy "admin: announcements 전체관리"
  on announcements for all to authenticated
  using (is_admin()) with check (is_admin());


-- ============================================================
-- Storage 버킷 (공지 이미지) — 공개(팝업에서 직접 표시)
--   업로드는 서버 service role. SQL Editor에서 막히면 대시보드에서
--   'announcements' (Public 켬) 버킷 수동 생성.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', true)
on conflict (id) do nothing;


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
