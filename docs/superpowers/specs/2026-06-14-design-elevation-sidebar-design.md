# 디자인 개편 — 카드 입체감 + 사이드바 가독성/아이콘 설계

작성일: 2026-06-14

## 목표

- 각 페이지의 카드·섹션이 배경과 혼합되어 밋밋함 → **은은하게 떠 보이는 입체감**(shadow + ring).
- 사이드바 컬러 이모지(🏠📚🩺…) → **lucide-react 단색 라인 아이콘**(테마색 상속).
- 사이드바 **폰트 크기 확대 + 가독성(대비) 강화**.
- **라이트(크림/마룬)·다크(네이비/골드) 톤앤매너 유지** — 색/브랜드 토큰 변경 0, shadow·ring·폰트·아이콘만 손봄.

## 결정

- 입체감 강도 = **은은하게**(soft). 라이트 `shadow-sm + ring-1 ring-cream-line`,
  다크 `shadow-md + ring-1 ring-zinc-800`.
- 아이콘 = **lucide-react 라인 아이콘 도입**(의존성 1개 추가).
- 카드 스타일은 흩어진 인라인 클래스를 한 곳(`.app-card` 유틸)으로 수렴.

## 변경 사항

### 1. `globals.css` — 공통 입체 카드 유틸

`@layer components`에 추가:

```css
@layer components {
  .app-card {
    @apply rounded-2xl bg-cream-card shadow-sm ring-1 ring-cream-line;
  }
  .dark .app-card {
    @apply bg-zinc-950 shadow-md ring-zinc-800;
    /* shadow 는 네이비 배경에서 은은하게 — ring 으로 경계 보강 */
  }
}
```

- 기존 `border border-zinc-200`(라이트) 카드 → `.app-card`로 교체(ring이 border 역할).
- 색 토큰(`cream-card`, `zinc-950`)은 그대로. shadow·ring만 신규.

### 2. 사이드바 아이콘 — `nav.ts` + `Sidebar.tsx`

- `lucide-react` 설치.
- `nav.ts`: `NavItem.icon`/`NavGroup.icon` 타입을 `string` → `LucideIcon`(컴포넌트 참조).
  `.ts` 파일에서 JSX 없이 컴포넌트를 import해 값으로 보관(렌더는 Sidebar에서).
- 아이콘 매핑:
  | 메뉴 | lucide |
  |------|--------|
  | 대시보드 | `Home` |
  | 메시지 발송 | `Send` |
  | 클래스(그룹) | `BookOpen` |
  | 정규반 관리 | `Book` |
  | 자료실 | `FolderOpen` |
  | 정규/클리닉 캘린더 | `Calendar` |
  | 주간 시간표 | `Clock` |
  | 클리닉반 관리(그룹/항목) | `Stethoscope` |
  | 클리닉 자료실 | `FolderOpen` |
  | 원장 통합 관리(그룹) | `ShieldCheck` |
  | 학생 통합 관리 | `GraduationCap` |
  | 강사 관리 | `Users` |
  | 공지 관리 | `Megaphone` |
  | 학원 설정 | `Settings` |
- `currentLabel`/`isActive` 등 로직은 그대로(아이콘 타입만 변경되므로 영향 없음).

### 3. 사이드바 가독성 — `Sidebar.tsx`

- 메뉴 링크 폰트: `text-sm`(14px) → `text-[15px]`, 하위 `text-[13px]` → `text-sm`(14px).
- 그룹 헤더: `text-xs` → `text-[13px]`, 대비 강화.
- 비활성 글자색 대비 상향: `text-brand/80` → `text-brand/90`, 하위 동일 기조.
- 아이콘 렌더: `<item.icon className="h-[18px] w-[18px]" strokeWidth={2} />` 형태,
  활성 시 색은 부모 텍스트색(현재 `text-white`/`dark:text-[#0a192f]`) 상속.
- 로고 영역·로그아웃은 구조 유지(필요 시 폰트만 소폭 상향).

### 4. 주요 페이지 카드 입체감 적용

대상 페이지의 **카드·패널·테이블 컨테이너**를 `.app-card`로 교체(또는 그림자 보강):

- `/dashboard` (요약 카드·반별 행 테이블·주간 캘린더 카드)
- `/classes`, `/clinic` (`ClassGrid` — 강사색 띠 커스텀은 유지, shadow/ring만 보강)
- `/admin/classes`, `/admin/clinics` (ClassManager 테이블)
- `/materials`, `/clinic/materials` (MaterialsBrowser 패널/테이블)
- `/calendar`, `/clinic/calendar` (CalendarBoard 컨테이너)
- `/admin/students` (StudentAdminTable — 테이블·일괄배정 바)
- `/admin/teachers` (강사 테이블/카드)
- `/admin/settings` (SettingsForm 카드)
- `/admin/announcements` (AnnouncementManager 카드/목록)
- `TopBar` — 필요 시 하단 그림자 소폭

교체 원칙: 기존 `rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950`
패턴을 `app-card`로. 모달(이미 `shadow-xl`)·작은 칩/배지는 제외.

## 범위 밖 (YAGNI)

- 색/브랜드 팔레트 변경, 다크/라이트 톤 재설계.
- 레이아웃(그리드/간격) 대개편.
- 37개 전 파일 일괄 치환 — 핵심 페이지 우선, 나머지는 동일 `.app-card`로 점진 통일.

## 검증

- `tsc` + `eslint` + `next build` 통과.
- 라이트/다크 양쪽에서 카드가 배경과 분리돼 떠 보이고, 사이드바 아이콘이 단색
  라인으로 테마색을 따르며, 글자가 더 크고 또렷한지 육안 확인.
