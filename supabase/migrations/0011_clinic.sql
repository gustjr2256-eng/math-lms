-- ============================================================
-- 0011 — 클리닉반(class_type) + 클리닉 자료실(scope)
-- 0010 적용 이후 실행. 기존 반/자료는 default 로 'regular' → 하위호환.
-- ============================================================

-- 반 유형 (정규반 / 클리닉반)
do $$ begin
  create type class_type as enum ('regular','clinic');
exception when duplicate_object then null; end $$;

alter table classes
  add column if not exists class_type class_type not null default 'regular';

-- 자료실 범위 (정규 / 클리닉)
do $$ begin
  create type material_scope as enum ('regular','clinic');
exception when duplicate_object then null; end $$;

alter table materials
  add column if not exists scope material_scope not null default 'regular';
