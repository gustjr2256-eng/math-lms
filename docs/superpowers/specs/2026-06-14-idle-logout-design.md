# 유휴 자동 로그아웃 (Idle Logout) 설계

작성일: 2026-06-14

## 배경 / 문제

`proxy.ts`의 인증 게이트는 정상 동작한다(미인증 → `/login`). 그러나 한 번
로그인하면 Supabase 세션 쿠키가 브라우저에 남아, 공용 PC나 자리를 비운 사이
**누군가 같은 컴퓨터로 접속하면 로그인 화면 없이 원장 관리 페이지가 열리는**
위험이 있다. 이는 모든 웹앱 공통의 "로그인 유지" 동작이지만, 원장 권한은
학생 개인정보·성적까지 노출하므로 추가 보호가 필요하다.

## 목표

- 일정 시간(**30분**) 키보드·마우스 활동이 없으면 자동으로 세션을 종료하고
  `/login`으로 보낸다.
- 로그아웃 **1분 전 경고 모달**을 띄워, 작업 중 갑작스러운 로그아웃을 방지한다.
- 활동이 감지되면 타이머를 리셋한다.

## 범위 밖 (YAGNI)

- 탭 간 실시간 타이머 동기화
- 서버측 강제 세션 만료(idle 기준)
- 로그아웃 후 원래 페이지로 복귀(redirect-back)

로그아웃 시 `signOut()`이 쿠키를 지우므로, 다른 탭도 다음 요청에서 `proxy.ts`에
의해 자연히 `/login`으로 이동한다.

## 접근 방식

순수 클라이언트 타이머. `setTimeout` 기반으로 활동 이벤트에서 리셋한다.
Web Worker(과함)·서버 세션 만료(유휴 감지 불가)는 배제.

## 컴포넌트

### `src/components/auth/IdleLogout.tsx` (client)

`AppShell` 내부에 렌더 → 로그인된 모든 페이지에 자동 적용. 로그인/회원가입/
제출 페이지는 `AppShell` 밖(비로그인 영역)이라 영향 없음.

**상수 (파일 상단, 조정 용이):**

```ts
const IDLE_LIMIT_MS = 30 * 60 * 1000  // 30분 무활동 시 로그아웃
const WARN_BEFORE_MS = 60 * 1000      // 로그아웃 1분 전 경고
const MOUSEMOVE_THROTTLE_MS = 1000    // mousemove 리셋 쓰로틀
```

**상태 / 참조:**

- `useState` — `warning: boolean`(경고 모달 표시 여부), `remaining: number`(카운트다운 표시용 초).
- `useRef` — 타이머 핸들(idle 타이머, 경고 카운트다운 interval), 마지막 mousemove 처리 시각. 타이머·이벤트는 ref로 관리하고 **렌더에 필요한 값만 state**로 둬 effect 내 setState 린트(set-state-in-effect)를 피한다.

**동작 흐름:**

1. 마운트 시 활동 이벤트 리스너 등록: `mousemove`(쓰로틀), `keydown`, `click`, `scroll`, `touchstart`. idle 타이머(30분) 시작.
2. 활동 감지 → 경고 모달이 떠 있지 않은 상태면 idle 타이머 리셋.
3. idle 타이머 만료(29분 무활동 = 30분−1분) 시점에 `warning=true`, 60초 카운트다운 interval 시작.
   - 구현상 idle 타이머를 `IDLE_LIMIT_MS - WARN_BEFORE_MS`(29분)로 두고, 만료 시 경고 단계로 진입한다.
4. 경고 모달의 [계속 이용하기] → `warning=false`, 카운트다운 정리, idle 타이머 재시작.
5. 카운트다운 0 도달 → `supabase.auth.signOut()` → `router.replace('/login')`.
6. 언마운트 시 모든 리스너·타이머 정리.

**경고 중 활동 처리:** 경고 모달이 떠 있는 동안의 활동은 타이머를 자동
리셋하지 **않는다**(명시적으로 [계속 이용하기]를 눌러야 연장). 자리를 비운
사이 마우스가 살짝 움직여 로그아웃이 무한 연기되는 것을 막기 위함.

### 경고 모달 (UI)

- framer-motion spring 모달. 기존 `AnnouncementPopup` 패턴(오버레이 fade +
  카드 spring) 재사용.
- 내용: "장시간 활동이 없어 곧 로그아웃됩니다." + 카운트다운 `(00:59)` +
  [계속 이용하기] 버튼.
- 테마: 크림/마룬(라이트) · 다크 골드 일관 적용(`dark:bg-gold dark:text-[#0a192f]`
  등 기존 surgical 패턴). 제목 font-paperozi, 본문 font-pretendard.

## 데이터 흐름 / 의존성

- Supabase 브라우저 클라이언트(`@supabase/ssr`의 client createBrowserClient 기존 헬퍼) 로 `signOut()`.
- `next/navigation`의 `useRouter().replace('/login')`.
- 외부 상태·DB 변경 없음. 순수 프론트.

## 에러 처리

- `signOut()` 실패 시에도 `router.replace('/login')`은 수행한다(세션이 어떤
  이유로 안 지워져도 최소한 화면은 로그인으로 전환; proxy가 재검증). signOut을
  try/catch로 감싸고 실패는 무시(또는 콘솔 경고).

## 검증

- `tsc` + `eslint` + `next build` 통과.
- 수동: 상수를 짧게(예: 10초/5초) 임시 변경해 경고 모달·카운트다운·자동
  로그아웃·[계속 이용하기] 연장·활동 리셋 동작을 육안 확인 후 원복.
- 마이그레이션 없음(프론트 전용).
