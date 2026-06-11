# 단계 23 — 데이터 시각화 대시보드 (설계)

작성일: 2026-06-12
상태: 승인됨 → 구현 예정

## 목표

버튼 중심 대시보드를 정규반 당일 운영 통계 + 이번 주 학원 일정 중심의 정보형
대시보드로 재구성한다. 의존성 없이 CSS로 시각화하고, 라이트/다크 테마 포인트
색상으로 수치를 강조한다.

## 확정된 설계 결정 (브레인스토밍)

- **주간 캘린더 3범주 = 실데이터 3소스 조합**: academy_schedules(기간=시험대비, 특정일=일반) + classes.day_of_week 파생(정규 수업) + tests.test_date(테스트).
- **통계 범위 = 정규반(class_type='regular')만, 반별**. RLS 그대로(원장=전체, 강사=담당).

## 레이아웃 (`/dashboard` 재작성, gap-6 카드 그리드)

- 인사 헤더(간결) → [정규반 당일 출석률] 반별 도넛 그리드(sm:2/lg:3) → [오늘 결석자]·[오늘의 진도] 2카드(lg:2) → [이번 주 학원 일정] 가로 캘린더(full).
- 기존 버튼 카드 전부 제거(이동은 사이드바). 카드 `rounded-xl` + `shadow-sm` + `border`. 제목=Paperozi, 수치=Pretendard.
- 포인트 색상: globals.css에 `--accent`(라이트 `#792316` / 다크 `#ffd700`) 추가 → 게이지 아크·강조 수치에 사용.

## 1) 당일 출석률 — 반별 도넛 게이지

- 정규반 각각 오늘 attendance 집계.
- 의존성 0 도넛: `conic-gradient(var(--accent) <pct>%, <track> 0)` + 중앙 % (Pretendard bold).
- 출석률 = checked>0 ? (출석+지각+조퇴)/checked : null(미체크). 하단 반명 + 체크 n/전체.

## 2) 결석자 명단 / 진도 요약

- 결석자: 오늘 attendance status='결석' → student_id를 students_view 이름 매핑 → `{이름} · {반명}`. 없으면 빈 상태.
- 진도: 반별 최신 progress 1건 → `{반명}: {textbook} {chapter} {page_from}–{page_to}p`. 없으면 빈 상태.

## 3) 이번 주 캘린더 (가로형, 읽기 전용)

- 이번 주(일~토) 7칸. `lib/calendar.ts` 재사용:
  - 시험대비 기간 = academy period → `assignGlobalLanes`+`layoutPeriods` 배경 막대(레인, ◀▶ 연속).
  - 테스트 = tests.test_date 이번 주 → 칸 배지(rose).
  - 정규 수업 = classes.day_of_week 파싱 → 요일 칸 반명 칩(blue).
  - 일반 특정일 = academy single → `singlesByCol` 배지(color).
- `COLORS`/`colorOf` 재사용 + 범례. 상세는 /calendar.

## 데이터 (`src/lib/dashboard.ts`, 순수 함수)

- 타입 + 집계: `buildClassStats`, `thisWeekCells`, `weeklyClassSessions`, 결석자 매핑.
- page가 실 DB 주입. 빈 데이터 graceful. "Mock Data 예시"는 입력 형태로 문서화.
- 데이터: attendance(class_id/student_id/date/status), progress(class_id/date/textbook/chapter/page_from/to), tests(class_id/test_date/title), classes(id/name/day_of_week/class_type), students_view(id/name/class_id), academy_schedules(period/single/color).

## 컴포넌트

- `src/lib/dashboard.ts`
- `src/components/dashboard/AttendanceDonut.tsx` (도넛 1개)
- `src/components/dashboard/WeeklyCalendar.tsx` (서버 컴포넌트, 인터랙션 없음)
- `src/app/dashboard/page.tsx` 재작성(AnnouncementAutoOpen 유지).

## 검증

- `npx tsc --noEmit` + `npx next build`.
- 라이트/다크 게이지·캘린더 가독성. 빈 데이터 상태.
- academy_schedules(0006)·tests(0003) 미적용 환경에서도 graceful(빈 배열).

## 범위 밖 (YAGNI)

- 클리닉반 통계, 강사 본인 외 반, 월간/주간 토글, 캘린더 인터랙션(편집).
- 통계 추세 그래프(주/월 추이).
