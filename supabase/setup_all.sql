-- ============================================================
-- 수학학원 LMS — 스키마 + RLS 정책
-- Supabase SQL Editor에서 순서대로 실행하세요.
-- ============================================================

-- ============================================================
-- 0. 확장
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- 1. ENUM 타입
-- ============================================================
create type user_role          as enum ('admin', 'teacher');
create type attendance_status  as enum ('출석', '결석', '지각', '조퇴');
create type notification_type  as enum ('sms', 'kakao');


-- ============================================================
-- 2. 테이블
-- ============================================================

-- users (auth.users 와 1:1 연결)
create table users (
  id           uuid        primary key references auth.users(id) on delete cascade,
  name         text        not null,
  email        text        not null unique,
  role         user_role   not null default 'teacher',
  phone        text,
  created_at   timestamptz not null default now()
);

-- classes
create table classes (
  id           uuid        primary key default uuid_generate_v4(),
  name         text        not null,
  subject      text        not null,
  day_of_week  text        not null,  -- 예) '월,수,금'
  time         text        not null,  -- 예) '15:00~17:00'
  teacher_id   uuid        not null references users(id) on delete restrict,
  created_at   timestamptz not null default now()
);

-- students
create table students (
  id             uuid  primary key default uuid_generate_v4(),
  name           text  not null,
  grade          text  not null,   -- 예) '중2', '고1'
  student_phone  text,
  parent_phone   text,
  memo           text,
  created_at     timestamptz not null default now()
);

-- class_students (학생 ↔ 반 다대다)
create table class_students (
  class_id    uuid        not null references classes(id)  on delete cascade,
  student_id  uuid        not null references students(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

-- attendance
create table attendance (
  id          uuid              primary key default uuid_generate_v4(),
  class_id    uuid              not null references classes(id)  on delete cascade,
  student_id  uuid              not null references students(id) on delete cascade,
  date        date              not null,
  status      attendance_status not null,
  note        text,
  unique (class_id, student_id, date)
);

-- daily_tests
create table daily_tests (
  id          uuid    primary key default uuid_generate_v4(),
  class_id    uuid    not null references classes(id)  on delete cascade,
  student_id  uuid    not null references students(id) on delete cascade,
  test_date   date    not null,
  score       numeric(5,2) not null,
  full_score  numeric(5,2) not null default 100,
  memo        text
);

-- weekly_tests (시험 헤더)
create table weekly_tests (
  id          uuid    primary key default uuid_generate_v4(),
  class_id    uuid    not null references classes(id) on delete cascade,
  test_date   date    not null,
  title       text    not null,
  full_score  numeric(5,2) not null default 100
);

-- weekly_test_scores (학생별 점수)
create table weekly_test_scores (
  id             uuid    primary key default uuid_generate_v4(),
  weekly_test_id uuid    not null references weekly_tests(id) on delete cascade,
  student_id     uuid    not null references students(id)     on delete cascade,
  score          numeric(5,2) not null,
  rank           integer,
  unique (weekly_test_id, student_id)
);

-- exams (학교 시험 헤더)
create table exams (
  id          uuid    primary key default uuid_generate_v4(),
  class_id    uuid    not null references classes(id) on delete cascade,
  title       text    not null,
  exam_date   date    not null,
  full_score  numeric(5,2) not null default 100
);

-- exam_scores (학생별 점수)
create table exam_scores (
  id          uuid    primary key default uuid_generate_v4(),
  exam_id     uuid    not null references exams(id)    on delete cascade,
  student_id  uuid    not null references students(id) on delete cascade,
  score       numeric(5,2) not null,
  rank        integer,
  unique (exam_id, student_id)
);

-- progress (진도)
create table progress (
  id          uuid  primary key default uuid_generate_v4(),
  class_id    uuid  not null references classes(id) on delete cascade,
  date        date  not null,
  textbook    text  not null,
  chapter     text,
  page_from   integer,
  page_to     integer,
  memo        text
);

-- homework
create table homework (
  id           uuid  primary key default uuid_generate_v4(),
  class_id     uuid  not null references classes(id) on delete cascade,
  title        text  not null,
  due_date     date  not null,
  description  text,
  form_link    text,
  sheet_link   text
);

-- homework_status
create table homework_status (
  id           uuid        primary key default uuid_generate_v4(),
  homework_id  uuid        not null references homework(id)  on delete cascade,
  student_id   uuid        not null references students(id) on delete cascade,
  is_submitted boolean     not null default false,
  checked_at   timestamptz,
  unique (homework_id, student_id)
);

-- notification_log
create table notification_log (
  id           uuid               primary key default uuid_generate_v4(),
  homework_id  uuid               not null references homework(id)  on delete cascade,
  student_id   uuid               not null references students(id) on delete cascade,
  type         notification_type  not null,
  message      text               not null,
  sent_at      timestamptz        not null default now(),
  sent_by      uuid               not null references users(id) on delete restrict
);


-- ============================================================
-- 3. 인덱스 (자주 조회되는 FK 컬럼)
-- ============================================================
create index on classes            (teacher_id);
create index on class_students     (student_id);
create index on attendance         (class_id, date);
create index on daily_tests        (class_id, test_date);
create index on weekly_tests       (class_id);
create index on weekly_test_scores (weekly_test_id);
create index on exams              (class_id);
create index on exam_scores        (exam_id);
create index on progress           (class_id, date);
create index on homework           (class_id, due_date);
create index on homework_status    (homework_id);
create index on notification_log   (homework_id);


-- ============================================================
-- 4. 신규 가입 시 users 레코드 자동 생성 트리거
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'teacher')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ============================================================
-- 5. 헬퍼 함수 (RLS 정책에서 재사용)
-- ============================================================

-- 현재 로그인 유저가 admin인지 확인
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 현재 로그인 유저가 특정 반의 담당 강사인지 확인
create or replace function is_teacher_of_class(p_class_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from classes
    where id = p_class_id and teacher_id = auth.uid()
  );
$$;


-- ============================================================
-- 6. RLS 활성화
-- ============================================================
alter table users              enable row level security;
alter table classes            enable row level security;
alter table students           enable row level security;
alter table class_students     enable row level security;
alter table attendance         enable row level security;
alter table daily_tests        enable row level security;
alter table weekly_tests       enable row level security;
alter table weekly_test_scores enable row level security;
alter table exams               enable row level security;
alter table exam_scores        enable row level security;
alter table progress           enable row level security;
alter table homework           enable row level security;
alter table homework_status    enable row level security;
alter table notification_log   enable row level security;


-- ============================================================
-- 7. RLS 정책
-- ============================================================

------------------------------------------------------------
-- users
------------------------------------------------------------
-- admin: 전체 CRUD
create policy "admin: users 전체"
  on users for all to authenticated
  using (is_admin()) with check (is_admin());

-- teacher: 본인 레코드 조회
create policy "teacher: users 본인 조회"
  on users for select to authenticated
  using (id = auth.uid());

-- teacher: 본인 레코드 수정 (role 변경 불가)
create policy "teacher: users 본인 수정"
  on users for update to authenticated
  using  (id = auth.uid())
  with check (id = auth.uid() and role = 'teacher');

------------------------------------------------------------
-- classes
------------------------------------------------------------
create policy "admin: classes 전체"
  on classes for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 본인 담당 반"
  on classes for all to authenticated
  using  (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

------------------------------------------------------------
-- students
------------------------------------------------------------
create policy "admin: students 전체"
  on students for all to authenticated
  using (is_admin()) with check (is_admin());

-- teacher: 본인 반에 속한 학생만 접근
create policy "teacher: 담당 반 소속 학생"
  on students for all to authenticated
  using (
    exists (
      select 1
      from class_students cs
      join classes c on cs.class_id = c.id
      where cs.student_id = students.id
        and c.teacher_id  = auth.uid()
    )
  )
  with check (true);

------------------------------------------------------------
-- class_students
------------------------------------------------------------
create policy "admin: class_students 전체"
  on class_students for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 수강생"
  on class_students for all to authenticated
  using  (is_teacher_of_class(class_id))
  with check (is_teacher_of_class(class_id));

------------------------------------------------------------
-- attendance
------------------------------------------------------------
create policy "admin: attendance 전체"
  on attendance for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 출결"
  on attendance for all to authenticated
  using  (is_teacher_of_class(class_id))
  with check (is_teacher_of_class(class_id));

------------------------------------------------------------
-- daily_tests
------------------------------------------------------------
create policy "admin: daily_tests 전체"
  on daily_tests for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 일일테스트"
  on daily_tests for all to authenticated
  using  (is_teacher_of_class(class_id))
  with check (is_teacher_of_class(class_id));

------------------------------------------------------------
-- weekly_tests
------------------------------------------------------------
create policy "admin: weekly_tests 전체"
  on weekly_tests for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 주간테스트"
  on weekly_tests for all to authenticated
  using  (is_teacher_of_class(class_id))
  with check (is_teacher_of_class(class_id));

------------------------------------------------------------
-- weekly_test_scores
------------------------------------------------------------
create policy "admin: weekly_test_scores 전체"
  on weekly_test_scores for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 주간테스트 점수"
  on weekly_test_scores for all to authenticated
  using (
    exists (
      select 1 from weekly_tests wt
      where wt.id = weekly_test_scores.weekly_test_id
        and is_teacher_of_class(wt.class_id)
    )
  )
  with check (
    exists (
      select 1 from weekly_tests wt
      where wt.id = weekly_test_scores.weekly_test_id
        and is_teacher_of_class(wt.class_id)
    )
  );

------------------------------------------------------------
-- exams
------------------------------------------------------------
create policy "admin: exams 전체"
  on exams for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 시험"
  on exams for all to authenticated
  using  (is_teacher_of_class(class_id))
  with check (is_teacher_of_class(class_id));

------------------------------------------------------------
-- exam_scores
------------------------------------------------------------
create policy "admin: exam_scores 전체"
  on exam_scores for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 시험 점수"
  on exam_scores for all to authenticated
  using (
    exists (
      select 1 from exams e
      where e.id = exam_scores.exam_id
        and is_teacher_of_class(e.class_id)
    )
  )
  with check (
    exists (
      select 1 from exams e
      where e.id = exam_scores.exam_id
        and is_teacher_of_class(e.class_id)
    )
  );

------------------------------------------------------------
-- progress
------------------------------------------------------------
create policy "admin: progress 전체"
  on progress for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 진도"
  on progress for all to authenticated
  using  (is_teacher_of_class(class_id))
  with check (is_teacher_of_class(class_id));

------------------------------------------------------------
-- homework
------------------------------------------------------------
create policy "admin: homework 전체"
  on homework for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 숙제"
  on homework for all to authenticated
  using  (is_teacher_of_class(class_id))
  with check (is_teacher_of_class(class_id));

------------------------------------------------------------
-- homework_status
------------------------------------------------------------
create policy "admin: homework_status 전체"
  on homework_status for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 숙제 제출 현황"
  on homework_status for all to authenticated
  using (
    exists (
      select 1
      from homework h
      join classes c on h.class_id = c.id
      where h.id = homework_status.homework_id
        and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from homework h
      join classes c on h.class_id = c.id
      where h.id = homework_status.homework_id
        and c.teacher_id = auth.uid()
    )
  );

------------------------------------------------------------
-- notification_log
------------------------------------------------------------
create policy "admin: notification_log 전체"
  on notification_log for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 알림 로그"
  on notification_log for all to authenticated
  using (
    exists (
      select 1
      from homework h
      join classes c on h.class_id = c.id
      where h.id = notification_log.homework_id
        and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from homework h
      join classes c on h.class_id = c.id
      where h.id = notification_log.homework_id
        and c.teacher_id = auth.uid()
    )
  );
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
-- ============================================================
-- 0004 — 비로그인 숙제 제출 + 반별 숙제 관리
-- 0003 적용 이후 실행.
-- homework 테이블은 schema.sql 의 것을 확장한다.
-- ============================================================

-- ============================================================
-- 1. homework 에 공유 토큰 추가 (추측 불가 URL)
-- ============================================================
alter table homework
  add column share_token uuid not null default uuid_generate_v4();

create unique index on homework (share_token);


-- ============================================================
-- 2. 제출물 테이블
--    학생은 계정이 없으므로 student_id 는 선택, 이름은 필수.
--    사진은 Storage에 저장하고 여기엔 URL만 기록.
-- ============================================================
create type homework_review as enum ('미검토', '완료', '미흡');

create table homework_submissions (
  id            uuid             primary key default uuid_generate_v4(),
  homework_id   uuid             not null references homework(id)  on delete cascade,
  student_id    uuid             references students(id) on delete set null,
  student_name  text             not null,
  image_url     text             not null,
  review        homework_review  not null default '미검토',
  submitted_at  timestamptz      not null default now(),
  reviewed_at   timestamptz
);

create index on homework_submissions (homework_id);


-- ============================================================
-- 3. RLS
--    제출(INSERT)은 서버의 service role 이 처리하므로 anon 정책은 없음.
--    조회/채점은 원장 또는 담당 강사만.
-- ============================================================
alter table homework_submissions enable row level security;

create policy "admin: submissions 전체"
  on homework_submissions for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "teacher: 담당 반 제출물"
  on homework_submissions for all to authenticated
  using (
    exists (
      select 1 from homework h
      where h.id = homework_submissions.homework_id
        and is_teacher_of_class(h.class_id)
    )
  )
  with check (
    exists (
      select 1 from homework h
      where h.id = homework_submissions.homework_id
        and is_teacher_of_class(h.class_id)
    )
  );


-- ============================================================
-- 4. Storage 버킷 (숙제 사진)
--    public 버킷 + 추측 불가 경로. service role 로 업로드.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('homework', 'homework', true)
on conflict (id) do nothing;


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
