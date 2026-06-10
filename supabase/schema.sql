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
