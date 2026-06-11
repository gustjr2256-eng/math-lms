-- ============================================================
-- 0010 — 통합 공지 확장 + 외부 서비스 연동 키 + 발송 로그
-- 0009 적용 이후 실행.
--   (a) announcements 에 반 타겟팅 + 서식 본문(HTML) 추가
--   (b) academy_settings — 솔라피 등 외부 서비스 키(원장 전용, 싱글톤)
--   (c) message_log — 일반 타겟팅 발송 로그(숙제 notification_log 와 분리)
-- ============================================================

-- (a) 공지 확장 -------------------------------------------------
alter table announcements
  add column if not exists target    text not null default 'all'
        check (target in ('all','class')),
  add column if not exists class_id  uuid references classes(id) on delete cascade,
  add column if not exists body_html text;


-- (b) 외부 서비스 연동 (단일 학원 → 싱글톤 행) ------------------
create table if not exists academy_settings (
  id                int primary key default 1 check (id = 1),
  solapi_api_key    text,
  solapi_api_secret text,
  solapi_sender     text,
  kakao_pf_id       text,
  updated_by        uuid references users(id) on delete set null,
  updated_at        timestamptz not null default now()
);

alter table academy_settings enable row level security;
drop policy if exists "admin: academy_settings 전체" on academy_settings;
create policy "admin: academy_settings 전체"
  on academy_settings for all to authenticated
  using (is_admin()) with check (is_admin());


-- (c) 일반 발송 로그 (원장 전용) -------------------------------
create table if not exists message_log (
  id         uuid        primary key default uuid_generate_v4(),
  channel    text        not null,            -- 'sms' | 'kakao'
  recipient  text        not null,            -- 'parent' | 'student'
  student_id uuid        references students(id) on delete set null,
  to_phone   text,
  message    text        not null,
  ok         boolean     not null,
  sent_by    uuid        references users(id) on delete set null,
  sent_at    timestamptz not null default now()
);
create index if not exists message_log_sent_at_idx on message_log (sent_at desc);

alter table message_log enable row level security;
drop policy if exists "admin: message_log 전체" on message_log;
create policy "admin: message_log 전체"
  on message_log for all to authenticated
  using (is_admin()) with check (is_admin());
