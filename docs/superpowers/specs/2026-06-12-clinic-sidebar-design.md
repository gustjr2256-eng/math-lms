# 단계 21 — 클리닉반 시스템 + 사이드바 재편 (설계)

작성일: 2026-06-12
상태: 승인됨 → 구현 예정

## 목표

정규반과 코드/로직을 공유하되 숙제 기능이 빠진 '클리닉반' 시스템을 추가하고,
사이드바를 [클래스]·[클리닉반 관리]·[원장 통합 관리] 그룹으로 재편하며 모든
아코디언 그룹을 기본 '열림' 상태로 초기화한다.

## 확정된 설계 결정 (브레인스토밍)

- **클리닉반 구분**: 별도 테이블 대신 `classes.class_type` enum('regular'/'clinic'). 코드·RLS·뷰 공유, 쿼리 필터만 다름.
- **클리닉 자료실**: `materials.scope` enum('regular'/'clinic') + 페이지 분리. 자료실 컴포넌트 재사용.
- **메뉴 중복 = 역할 분리**: [클래스]/[클리닉반] 그룹은 **운영 화면**, [원장 통합 관리]의 정규반/클리닉반은 **반 CRUD 관리**. 기존 강사/공지/메시지/설정 메뉴 유지.
- **숙제 비활성화**: `class_type='clinic'`이면 ClassTabs에서 숙제 탭 숨김 + 라우트 가드. 기존 라우트 구조 유지(전면 리팩터 안 함).
- **반 상세 라우트 공용**: 정규/클리닉 모두 `/classes/[id]` 하나 사용(코드 공유 극대화). 목록만 분리.

## 데이터 (마이그레이션 `0011_clinic.sql`)

```sql
-- 반 유형
do $$ begin
  create type class_type as enum ('regular','clinic');
exception when duplicate_object then null; end $$;
alter table classes add column if not exists class_type class_type not null default 'regular';

-- 자료실 범위
do $$ begin
  create type material_scope as enum ('regular','clinic');
exception when duplicate_object then null; end $$;
alter table materials add column if not exists scope material_scope not null default 'regular';
```
- 기존 반/자료는 자동으로 regular → 하위호환. RLS/뷰 변경 없음.

## 라우팅

| 경로 | 역할 | 권한 |
|---|---|---|
| `/classes` | 정규반 운영 목록(class_type='regular') | 전체 |
| `/clinic` | 클리닉반 운영 목록(class_type='clinic') | 전체 |
| `/classes/[id]` | 공용 상세(탭). clinic이면 숙제 탭 숨김 + 가드 | 전체 |
| `/materials` | 정규 자료실(scope='regular') | 승인자 |
| `/clinic/materials` | 클리닉 자료실(scope='clinic') | 승인자 |
| `/admin/classes` | 정규반 CRUD 관리 | 원장 |
| `/admin/clinics` | 클리닉반 CRUD 관리 | 원장 |

- `/admin/students`의 반 관리 섹션을 `/admin/classes`·`/admin/clinics`로 이전. 학생 통합 관리는 학생만 남김.

## 사이드바 (`nav.ts` + `Sidebar.tsx`)

- flat: 대시보드 / 캘린더 / 시간표
- [클래스] 그룹(전체): 정규반 관리(/classes), 자료실(/materials)
- [클리닉반 관리] 그룹(전체): 클리닉반 관리(/clinic), 클리닉 자료실(/clinic/materials)
- [원장 통합 관리] 그룹(원장): 학생 통합 관리, 정규반 관리(/admin/classes), 클리닉반 관리(/admin/clinics), 강사 관리, 공지 관리, 메시지 발송, 학원 설정
- `NavGroup`에 `adminOnly?` 추가, `NAV_GROUPS: NavGroup[]` 배열. Sidebar는 그룹마다 `<NavAccordion>`(자체 `useState(true)`) → **모든 그룹 기본 열림**, 닫기 전까지 펼침 유지.
- `currentLabel`/`isActive`가 모든 그룹 children을 포함하도록 갱신.

## 숙제 비활성화 (공유 컴포넌트)

- `ClassTabs({ classId, isHomeworkEnabled })` — false면 '숙제' 탭 제거.
- `/classes/[id]/layout.tsx`가 class 조회 시 `class_type` 읽어 `isHomeworkEnabled = class_type === 'regular'` 전달.
- `/classes/[id]/homework/page.tsx` 가드: clinic이면 `redirect('/classes/${id}')`.
- 목록은 공유 `<ClassGrid>` 컴포넌트로 /classes·/clinic 공통(제목/링크/빈상태 동일, 데이터만 주입).

## 액션

- `createClass`/`updateClass`(`ClassFormModal`)에 `class_type`. /admin/classes는 'regular', /admin/clinics는 'clinic'으로 생성.
- `createMaterial`(MaterialFormModal·materials 액션)에 `scope`. /materials='regular', /clinic/materials='clinic'.
- 목록/CRUD 쿼리에 `class_type`/`scope` 필터 추가.

## 호환 / 검증

- 완료 기준: `npx tsc --noEmit` + `npx next build` 통과.
- 0011 미적용이어도 graceful: 컬럼 없으면 쿼리에서 필터가 무시되거나(에러 시 빈 목록) 전부 regular로 동작. 앱 크래시 없음.
- 0011은 Supabase SQL Editor에서 사용자가 적용.

## 범위 밖 (YAGNI)

- 클리닉반 전용 통계/리포트.
- 클리닉 자료실 별도 Storage 버킷(기존 materials 버킷 공유, scope 컬럼으로만 구분).
- 대시보드 클리닉 카드(필요 시 추후).
- 시간표는 전체 반 표시 유지(정규/클리닉 구분 안 함).
