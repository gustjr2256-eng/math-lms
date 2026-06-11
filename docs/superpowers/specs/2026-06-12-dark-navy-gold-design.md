# 단계 22 — 다크모드 네이비/골드 테마 (설계)

작성일: 2026-06-12
상태: 승인됨 → 구현 예정

## 목표

다크모드 팔레트를 딥 네이비(#0A192F) 배경 + 골드(#FFD700) 포인트로 재정의한다.
골드는 행동 유도(CTA) 요소에만 전략적으로 배치하고, 라이트모드는 건드리지 않는다.

## 전제 정정

요구사항은 `tailwind.config.js` 수정을 명시하나 이 프로젝트는 **Tailwind v4**라
config 파일이 없다. 색상은 `globals.css`의 `@theme` + `.dark` 클래스로 관리한다.
또한 다크 스타일은 64개 파일에 `dark:zinc-*` 유틸(~375회)로 하드코딩돼 있다.

## 확정된 설계 결정 (브레인스토밍)

- **적용 방식**: `.dark`에서 zinc 스케일(`--color-zinc-50`~`950`)을 네이비 톤으로 **remap**.
  Tailwind v4가 `bg-zinc-900`을 `var(--color-zinc-900)`로 컴파일하므로, 변수만
  재정의하면 64개 파일을 건드리지 않고 전 컴포넌트가 즉시 네이비로 전환된다.
- **골드 범위**: 주요 CTA에만 surgical 적용. 제목/구조 텍스트의 마룬(brand)은 유지.

## globals.css 변경

### 1) `.dark` 배경/텍스트 + zinc remap
```css
.dark {
  --background: #0A192F;
  --foreground: #E6F1FF;

  /* zinc 스케일을 네이비 톤으로 재정의 → 기존 dark:zinc-* 유틸 전부 반영 */
  --color-zinc-50: #E6F1FF;   /* 주요 텍스트 */
  --color-zinc-100: #DBE7FF;
  --color-zinc-200: #C4D2EC;
  --color-zinc-300: #A8B8D8;  /* 보조 텍스트 */
  --color-zinc-400: #8195B8;  /* muted 텍스트 */
  --color-zinc-500: #5E739C;  /* faint 아이콘 */
  --color-zinc-600: #4A5F86;
  --color-zinc-700: #33476B;  /* 입력 보더 */
  --color-zinc-800: #233554;  /* 보더 · hover 면 */
  --color-zinc-900: #0E1E3A;  /* 입력 · 보조면 */
  --color-zinc-950: #112240;  /* 카드/패널 Surface */
}
```

### 2) `@theme`에 골드 토큰
```css
@theme {
  /* ...기존... */
  --color-gold: #FFD700;        /* 다크모드 CTA 포인트 */
  --color-gold-strong: #E6C200; /* hover */
}
```
→ `bg-gold`/`text-gold`/`border-gold` 유틸 자동 생성.

## 골드 CTA 적용 (3곳, 전략적)

1. **AnimationButton** (`AnimationButton.module.css` 다크 섹션):
   기본 `background:#FFD700; color:#0A192F`, hover 투명 + 골드 테두리/글자,
   box-shadow 골드 톤. → 설정 저장/공지 등록/반 생성/메시지 발송 등 하이라이트 버튼 다수 커버.
2. **ClassManager '새 반 만들기'** 버튼: `dark:bg-gold dark:text-[#0A192F] dark:hover:bg-gold-strong`.
3. **AnnouncementPopup**: '확인했습니다' 버튼 골드 + 헤더/종 알림 강조.

그 외 `bg-brand`(마룬)는 다크에서도 유지(활성 메뉴·구조). 골드는 행동 유도에만.

## 가독성 확인

- `#E6F1FF`(주요)·`#A8B8D8`(보조) on `#112240`(카드) → 대비 충분.
- 골드 `#FFD700` 버튼엔 네이비 글자(`#0A192F`)로 대비 확보(흰 글자 금지).
- 마룬 텍스트가 네이비 위에 직접 노출되는 곳(예: `text-brand`에 dark 오버라이드 없는 경우)은
  빌드 후 육안 확인해 필요 시 미세 보정.

## 검증

- 라이트모드 무변경.
- `npx tsc --noEmit` + `npx next build` 통과.
- dev에서 다크 토글 → 배경 네이비, 카드 Surface, 텍스트 연파랑, CTA 골드 확인.
- **핵심 검증**: zinc remap이 실제로 반영되는지(일부 유틸이 리터럴로 컴파일되면 미반영) 실제 화면으로 확인.

## 범위 밖 (YAGNI)

- 라이트모드 팔레트 변경.
- 시맨틱 토큰(surface/border) 전면 도입 + 64파일 마이그레이션.
- 골드를 텍스트/링크 전반으로 확대.
