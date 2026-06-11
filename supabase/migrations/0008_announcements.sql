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
