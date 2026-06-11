# 단계 20 — 원장 통합 공지 + 타겟팅 메시지 발송 (설계)

작성일: 2026-06-12
상태: 승인 대기 → 구현 예정

## 목표

원장 전용으로 (1) 반 타겟팅 + 서식 본문(WYSIWYG)을 갖춘 통합 공지 작성,
(2) 학생 목록 기반 타겟팅 SMS/카카오 발송, (3) 솔라피 API Key를 원장이 직접
입력하는 외부 서비스 연동 설정 페이지를 구축한다. 메시지 전송 로직은 솔라피 SDK를
쉽게 교체할 수 있도록 `MessageService`(서비스 패턴)로 추상화한다.

## 확정된 설계 결정 (브레인스토밍)

- **공지 저장**: 새 테이블 대신 **기존 `announcements` 확장** — 메인 팝업/종 연동 재사용,
  중복 팝업 시스템 방지.
- **에디터**: **경량 contentEditable 툴바**(의존성 0). 굵게/기울임/목록/제목. 저장 시 sanitize.
- **API Key 저장**: **DB `academy_settings`(admin RLS) 평문 + env 폴백**. 단일 학원·admin 전용이라
  평문 허용, env 키가 있으면 폴백. `MessageService`가 DB→env→mock 순으로 자격증명 해석.
- **발송 UI 위치**: **신규 `/admin/messages`**. 기존 숙제 미제출자 `NotifyPanel`은 용도가 달라 유지.
- **'특정 반 공지'**: 학생은 비로그인 계정이라 팝업은 강사/원장만 본다. 따라서 공지의 반 타겟은
  **라벨/분류 메타**로만 저장(팝업에 대상 반 라벨 표시), 실제 "반별 도달"은 메시지 발송으로 처리.

## 데이터 (마이그레이션 `0010_notices_messaging.sql`)

### (a) 공지 확장
```sql
alter table announcements
  add column target    text not null default 'all'
        check (target in ('all','class')),
  add column class_id  uuid references classes(id) on delete cascade, -- target='class'일 때
  add column body_html text;  -- WYSIWYG 결과(sanitize된 HTML). 기존 body(text)는 폴백/검색용 유지
```
- `target='class'`인데 `class_id`가 null이면 액션에서 검증 거부.
- 팝업/관리 목록에서 `target='class'`면 반 이름 라벨 표시.

### (b) 외부 서비스 연동 (싱글톤)
```sql
create table academy_settings (
  id                int primary key default 1 check (id = 1),
  solapi_api_key    text,
  solapi_api_secret text,
  solapi_sender     text,
  kakao_pf_id       text,
  updated_by        uuid references users(id),
  updated_at        timestamptz not null default now()
);
alter table academy_settings enable row level security;
create policy "admin: academy_settings 전체"
  on academy_settings for all to authenticated
  using (is_admin()) with check (is_admin());
```

### (c) 일반 발송 로그 (숙제와 분리)
```sql
create table message_log (
  id         uuid primary key default uuid_generate_v4(),
  channel    text not null,           -- 'sms' | 'kakao'
  recipient  text not null,           -- 'parent' | 'student'
  student_id uuid references students(id) on delete set null,
  to_phone   text,
  message    text not null,
  ok         boolean not null,
  sent_by    uuid references users(id),
  sent_at    timestamptz not null default now()
);
alter table message_log enable row level security;
create policy "admin: message_log 전체"
  on message_log for all to authenticated
  using (is_admin()) with check (is_admin());
```
→ 기존 `notification_log`(homework_id NOT NULL, 강사 RLS 의존)는 무손상.

## MessageService (서비스 패턴, `src/lib/messaging/`)

```
MessageProvider (interface)
  send(messages: SolapiMessage[], creds: Credentials): Promise<SendResult[]>
 ├─ SolapiProvider   기존 solapi.ts HMAC 로직을 creds 인자로 파라미터화
 └─ MockProvider     키 없을 때 dry-run(console.log)

MessageService
 ├─ resolveCredentials()  DB academy_settings → env → null
 ├─ pickProvider()        creds 있으면 Solapi, 없으면 Mock
 └─ sendBulk(channel, messages): BulkSendOutcome   ← 기존 시그니처 유지(하위호환)
```

- 기존 `solapi.ts`의 `solapiSendMany`/`authorizationHeader`를 **env 직접 참조 → creds 인자**로 변경.
- 기존 `index.ts`의 `sendBulk`는 `MessageService.sendBulk`로 위임(시그니처 동일).
- 기존 `notify.ts`(숙제 미제출자)는 변경 없이 동일 경로 사용.
- 업체 교체 = `XProvider` 추가 + `pickProvider` 한 줄.

## 화면

| 경로 | 내용 | 권한 |
|---|---|---|
| `/admin/announcements`(기존) | [통합/특정 반] 토글 + 반 선택 + **RichTextEditor** 추가. 본문을 contentEditable로 교체 | 원장 |
| `/admin/messages`(신규) | 전체 학생(반별 그룹) + 체크박스(전체선택/반전체/개별) → [메시지 발송] → 발송 폼 모달 | 원장 |
| `/admin/settings`(신규) | 외부 서비스 연동 — 솔라피 Key/Secret/발신번호 입력, 연결 상태 배지 | 원장 |

- 신규 컴포넌트: `RichTextEditor`(client, contentEditable + execCommand 툴바, hidden input에 sanitize된 HTML 동기화).
- 팝업 렌더: `body_html`을 **서버측 allowlist sanitize** 후 `dangerouslySetInnerHTML`. 허용 태그
  (b,i,strong,em,u,p,br,ul,ol,li,h2,h3,a[href]) 외 제거 + `on*`/`javascript:`/script/style 제거.
  작성자=신뢰된 원장 1인·단일 테넌트라 위험 낮으나 방어적 처리.
- nav: `ADMIN_GROUP`에 '메시지 발송'(✉️), '학원 설정'(⚙️) 추가.
- 신규 페이지 모두 `requireAdmin` + `AdminGuard`로 삼중 방어(기존 패턴).

## 액션 (`src/app/actions/messages.ts`, `settings.ts` 신규)

- `sendTargetedMessage({ studentIds, channel, recipient, message })`
  → `requireAdmin` → service role로 선택 학생 실번호 조회(원장이므로 전 학생 대상)
  → `{이름}`/`{name}` 치환 → `MessageService.sendBulk` → `message_log` 기록 →
  `{ ok, mock, sent, failed }` 반환.
- `saveMessagingSettings(formData)` → `requireAdmin` → `academy_settings` upsert(id=1).
- `getMessagingSettings()` → 설정 페이지 표시용(secret은 마스킹해서 노출, 존재여부만).
- 공지 액션 확장: `createAnnouncement`에 `target`/`class_id`/`body_html` 추가(zod 검증).

## 호환 / 검증

- 키 미설정 시 전 흐름 **mock**(console.log) 동작 — 키 없이 전체 검증 가능.
- 기존 숙제 알림(`notify.ts`/`NotifyPanel`) 동작 불변.
- 완료 기준: `npx tsc --noEmit` + `npx next build` 통과.
- 0010 마이그레이션은 Supabase SQL Editor에서 사용자가 적용(이전 단계와 동일, supabase-js로 DDL 불가).
  미적용이어도 앱은 graceful(공지 확장 컬럼/설정/로그 없으면 기능만 비활성, 크래시 없음).

## 범위 밖 (YAGNI)

- 알림톡 템플릿 등록/심사, 카카오 채널 실연동(채널은 ATA 매핑만, 템플릿은 추후).
- 발송 예약/스케줄, 발송 통계 리포트.
- secret 암호화(단일 테넌트·admin RLS 평문 결정).
- 공지 팝업의 학생 로그인 기반 반별 필터(학생 비로그인 구조).
