-- ============================================================
-- 0012 — 캘린더 정규/클리닉 분리 (academy_schedules.scope)
-- 0011 적용 이후 실행. 0011에서 만든 material_scope enum(regular/clinic) 재사용.
-- 기존 일정은 default 로 'regular' → 하위호환.
-- ============================================================

alter table academy_schedules
  add column if not exists scope material_scope not null default 'regular';

create index if not exists academy_schedules_scope_idx on academy_schedules (scope);
