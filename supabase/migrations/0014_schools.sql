-- ============================================================
-- 0014 — 학교 목록 관리 (schools)
-- 학생 등록 시 학교를 자유 입력이 아닌 드롭다운에서 선택하기 위한 선택지 목록.
-- students.school 은 그대로 text(학교 '이름' 저장) → 기존 데이터 호환, 뷰/액션 무변경.
-- schools 는 '선택지'만 제공한다.
-- 조회는 승인자 전체(드롭다운 노출), 추가/삭제는 원장(admin) 전용.
-- 미적용이어도 앱은 graceful(학교 드롭다운만 비고 크래시 없음).
-- ============================================================

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table schools enable row level security;

-- 재실행 안전(idempotent): 기존 정책이 있으면 지우고 다시 생성
drop policy if exists "approved: schools 조회" on schools;
drop policy if exists "admin: schools 등록" on schools;
drop policy if exists "admin: schools 삭제" on schools;

create policy "approved: schools 조회"
  on schools for select to authenticated
  using (is_approved());

create policy "admin: schools 등록"
  on schools for insert to authenticated
  with check (is_admin() and created_by = auth.uid());

create policy "admin: schools 삭제"
  on schools for delete to authenticated
  using (is_admin());
