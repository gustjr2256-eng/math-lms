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
