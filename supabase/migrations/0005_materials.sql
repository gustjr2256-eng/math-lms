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
