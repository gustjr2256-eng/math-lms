-- ============================================================
-- 0003 — 통합 시험(테스트) + 점수
-- 일일/주간/기타 시험을 한 구조로 다룬다. (기존 daily_tests/
-- weekly_tests/exams 계열은 이번 단계 미사용)
-- attendance, progress 는 schema.sql 의 기존 테이블을 재사용한다.
-- 0002 적용 이후 실행.
-- ============================================================

-- ============================================================
-- 1. 시험 종류 ENUM
-- ============================================================
create type test_kind as enum ('일일', '주간', '기타');


-- ============================================================
-- 2. tests (시험 헤더) + test_scores (학생별 점수)
-- ============================================================
create table tests (
  id          uuid        primary key default uuid_generate_v4(),
  class_id    uuid        not null references classes(id) on delete cascade,
  kind        test_kind   not null default '주간',
  title       text        not null,
  test_date   date        not null,
  full_score  numeric(5,2) not null default 100,
  created_at  timestamptz not null default now()
);

create table test_scores (
  id          uuid    primary key default uuid_generate_v4(),
  test_id     uuid    not null references tests(id)    on delete cascade,
  student_id  uuid    not null references students(id) on delete cascade,
  score       numeric(5,2) not null,
  unique (test_id, student_id)
);

create index on tests       (class_id, test_date);
create index on test_scores (test_id);


-- ============================================================
-- 3. RLS
-- ============================================================
alter table tests       enable row level security;
alter table test_scores enable row level security;

-- tests
create policy "admin: tests 전체"
  on tests for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 시험"
  on tests for all to authenticated
  using  (is_teacher_of_class(class_id))
  with check (is_teacher_of_class(class_id));

-- test_scores (소속 시험의 반 기준)
create policy "admin: test_scores 전체"
  on test_scores for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 점수"
  on test_scores for all to authenticated
  using (
    exists (
      select 1 from tests t
      where t.id = test_scores.test_id
        and is_teacher_of_class(t.class_id)
    )
  )
  with check (
    exists (
      select 1 from tests t
      where t.id = test_scores.test_id
        and is_teacher_of_class(t.class_id)
    )
  );
