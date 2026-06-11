# 단계 24 — 캘린더 정규/클리닉 분리 + 대시보드 캘린더 겹침 (설계)

작성일: 2026-06-12
상태: 승인됨 → 구현 예정

## 목표

학원 캘린더를 정규/클리닉 scope로 분리해 [클래스]·[클리닉반 관리] 그룹에 각각 배치하고,
메인 대시보드 주간 캘린더를 본 캘린더와 동일한 겹침(기간막대 위 특정일) 방식으로 바꾸되
성적/테스트 요소를 제거한다.

## 확정된 설계 결정 (브레인스토밍)

- **분리 방식**: `academy_schedules.scope`(regular/clinic) 추가. CalendarBoard 컴포넌트 공유, 쿼리·등록 scope만 다름.
- **대시보드 범위**: 정규(scope='regular') 일정만. 성적/테스트 제거 확정.

## 데이터 (마이그레이션 `0012_schedule_scope.sql`)

```sql
-- 0011의 material_scope enum(regular/clinic) 재사용
alter table academy_schedules
  add column if not exists scope material_scope not null default 'regular';
```
기존 일정 자동 regular(하위호환). RLS 무변경.

## 캘린더 2개 (CalendarBoard 공유)

| 경로 | 이름 | scope |
|---|---|---|
| `/calendar` | 정규 캘린더 | regular |
| `/clinic/calendar`(신규) | 클리닉 캘린더 | clinic |

- 페이지 쿼리 `.eq('scope', …)`. `CalendarBoard`에 `scope` prop → `ScheduleModal`/`createSchedule`에 hidden scope 전달. 렌더/겹침/수정 로직 공유.
- `Schedule` 타입에 `scope?` 추가(조회 컬럼 포함). 기존 select에 scope 추가.

## 사이드바 (`nav.ts`)

- `MAIN_NAV`: 대시보드, 시간표 (캘린더 제거).
- [클래스] 그룹: 정규반 관리(/classes), 자료실(/materials), 정규 캘린더(/calendar).
- [클리닉반 관리] 그룹: 클리닉반 관리(/clinic), 클리닉 자료실(/clinic/materials), 클리닉 캘린더(/clinic/calendar).
- currentLabel/isActive는 NAV_GROUPS 기반이라 자동 반영.

## 대시보드 주간 캘린더 (겹침 + 성적 제거)

- `WeeklyCalendar`를 CalendarBoard와 동일 겹침으로 재작성: 기간막대 band + 특정일 배지를 `laneCoveringCol`+절대좌표로 막대 위(같은 색 부모 막대 우선)에 겹침. 읽기 전용(클릭/모달 없음).
- 테스트/성적 완전 제거(`tests` prop·쿼리 삭제). academy_schedules scope='regular'의 period+single만.
- 상수(HEADER/BAR_H/LANE_STEP 등)와 helper는 calendar.ts/CalendarBoard 패턴 재사용.

## 검증

- `npx tsc --noEmit` + `npx next build`.
- 라이트/다크 겹침 정렬, 빈 데이터 graceful.
- 0012 미적용 시 `.eq('scope',…)` 에러→빈 배열(크래시 없음). 적용 권장.

## 범위 밖 (YAGNI)

- 캘린더 간 일정 이동/복제, scope별 색 팔레트 분리.
- 대시보드 주간 캘린더의 인터랙션(추가/수정).
