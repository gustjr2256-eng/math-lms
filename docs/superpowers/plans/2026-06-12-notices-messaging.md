# 통합 공지 + 타겟팅 메시지 발송 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원장 전용 통합/반별 공지(WYSIWYG) + 학생 타겟팅 SMS/카카오 발송 + 솔라피 키 설정 페이지를, 교체 가능한 MessageService 추상화 위에 구축한다.

**Architecture:** 기존 `announcements` 테이블을 확장(target/class_id/body_html)하고, 신규 `academy_settings`(키)·`message_log`(발송로그)를 추가한다. 메시징은 `MessageProvider` 인터페이스(Solapi/Mock) + `MessageService`(DB→env→mock 자격증명 해석)로 추상화하며 기존 `sendBulk` 시그니처를 유지해 숙제 알림과 한 경로로 통합한다. 화면 3개(공지 확장, 신규 /admin/messages, 신규 /admin/settings)는 모두 `requireAdmin`+`AdminGuard` 삼중 방어.

**Tech Stack:** Next.js 16.2.9(App Router, server actions, proxy.ts), @supabase/ssr, PostgreSQL/Supabase RLS, Tailwind v4(크림/마룬 테마, font-pretendard/paperozi), zod. 의존성 추가 없음(에디터는 contentEditable).

**검증 관행:** 이 레포는 테스트 프레임워크가 없다. 각 태스크는 `npx tsc --noEmit`와 필요한 경우 `npx next build`로 검증하고, 메시징은 키 미설정 mock(console.log) 흐름으로 확인한다. 커밋은 사용자가 요청할 때만(레포가 git이지만 자동 커밋 금지) — 본 계획의 "Commit" 단계는 사용자 승인 시에만 수행.

---

## File Structure

**생성:**
- `supabase/migrations/0010_notices_messaging.sql` — 공지 확장 + academy_settings + message_log
- `src/lib/messaging/types.ts` — 공유 타입(MessageChannel, OutgoingMessage, SendResult, BulkSendOutcome, Credentials, SolapiMessage)
- `src/lib/messaging/providers/MessageProvider.ts` — provider 인터페이스
- `src/lib/messaging/providers/SolapiProvider.ts` — 솔라피 HMAC(creds 인자화)
- `src/lib/messaging/providers/MockProvider.ts` — dry-run
- `src/lib/messaging/MessageService.ts` — 자격증명 해석 + provider 선택 + sendBulk
- `src/lib/sanitize-html.ts` — 서버측 allowlist sanitize
- `src/lib/settings.ts` — 설정 타입/마스킹 헬퍼(공유)
- `src/app/actions/settings.ts` — saveMessagingSettings / getMessagingSettings
- `src/app/actions/messages.ts` — sendTargetedMessage
- `src/app/admin/settings/page.tsx` + `_components/SettingsForm.tsx`
- `src/app/admin/messages/page.tsx` + `_components/MessageComposer.tsx`
- `src/components/ui/RichTextEditor.tsx` — contentEditable 에디터

**수정:**
- `src/lib/messaging/index.ts` — sendBulk를 MessageService로 위임(시그니처 유지)
- `src/lib/messaging/solapi.ts` — 삭제(로직을 SolapiProvider로 이전) 또는 재노출 래퍼
- `src/app/actions/announcements.ts` — createAnnouncement에 target/class_id/body_html
- `src/lib/announcements.ts` — Announcement 타입에 target/class_id/body_html 추가
- `src/app/admin/announcements/_components/AnnouncementManager.tsx` — 반토글 + RichTextEditor
- `src/app/admin/announcements/page.tsx` — classes 목록 전달
- `src/components/announcements/AnnouncementPopup.tsx` — body_html 렌더 + 반 라벨
- `src/components/layout/nav.ts` — ADMIN_GROUP에 '메시지 발송' '학원 설정'
- `supabase/APPLY_0005_0008.sql` 류와 동일하게 `APPLY_0010.sql` 추가(선택)

---

## Task 1: 마이그레이션 0010 (DB 스키마)

**Files:**
- Create: `supabase/migrations/0010_notices_messaging.sql`

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/0010_notices_messaging.sql`:
```sql
-- ============================================================
-- 0010 — 통합 공지 확장 + 외부 서비스 연동 키 + 발송 로그
-- 0009 적용 이후 실행.
-- ============================================================

-- (a) 공지 확장: 반 타겟팅 + 서식 본문(HTML)
alter table announcements
  add column if not exists target    text not null default 'all'
        check (target in ('all','class')),
  add column if not exists class_id  uuid references classes(id) on delete cascade,
  add column if not exists body_html text;

-- (b) 외부 서비스 연동 (단일 학원 → 싱글톤 행, 원장 전용)
create table if not exists academy_settings (
  id                int primary key default 1 check (id = 1),
  solapi_api_key    text,
  solapi_api_secret text,
  solapi_sender     text,
  kakao_pf_id       text,
  updated_by        uuid references users(id) on delete set null,
  updated_at        timestamptz not null default now()
);
alter table academy_settings enable row level security;
drop policy if exists "admin: academy_settings 전체" on academy_settings;
create policy "admin: academy_settings 전체"
  on academy_settings for all to authenticated
  using (is_admin()) with check (is_admin());

-- (c) 일반 발송 로그 (숙제 notification_log와 분리, 원장 전용)
create table if not exists message_log (
  id         uuid primary key default uuid_generate_v4(),
  channel    text not null,
  recipient  text not null,
  student_id uuid references students(id) on delete set null,
  to_phone   text,
  message    text not null,
  ok         boolean not null,
  sent_by    uuid references users(id) on delete set null,
  sent_at    timestamptz not null default now()
);
create index if not exists message_log_sent_at_idx on message_log (sent_at desc);
alter table message_log enable row level security;
drop policy if exists "admin: message_log 전체" on message_log;
create policy "admin: message_log 전체"
  on message_log for all to authenticated
  using (is_admin()) with check (is_admin());
```

- [ ] **Step 2: 검증 (SQL 문법 정적 확인)**

DDL은 supabase-js로 적용 불가(이전 단계와 동일). 파일 존재/문법만 육안 확인.
사용자가 Supabase SQL Editor에서 실행하도록 안내 문구를 최종 보고에 포함.
Expected: `uuid_generate_v4`, `is_admin()`는 schema.sql에서 이미 정의됨(0001) → 의존성 충족.

---

## Task 2: MessageService 추상화 (서비스 패턴)

**Files:**
- Create: `src/lib/messaging/types.ts`, `providers/MessageProvider.ts`, `providers/SolapiProvider.ts`, `providers/MockProvider.ts`, `MessageService.ts`
- Modify: `src/lib/messaging/index.ts`, 삭제: `src/lib/messaging/solapi.ts`

- [ ] **Step 1: 공유 타입 작성**

`src/lib/messaging/types.ts`:
```ts
export type MessageChannel = 'sms' | 'kakao'

export type OutgoingMessage = {
  to: string
  text: string
  ref?: string
}

export type SendResult = {
  to: string
  ref?: string
  ok: boolean
  error?: string
}

export type BulkSendOutcome = {
  mock: boolean
  results: SendResult[]
  sent: number
  failed: number
}

export type SolapiMessage = {
  to: string
  text: string
  type: 'SMS' | 'LMS' | 'ATA'
}

export type Credentials = {
  apiKey: string
  apiSecret: string
  sender: string
}
```

- [ ] **Step 2: provider 인터페이스 작성**

`src/lib/messaging/providers/MessageProvider.ts`:
```ts
import type { SolapiMessage, SendResult, Credentials } from '../types'

// 메시지 발송 업체 추상화. 솔라피 외 업체로 교체 시 이 인터페이스만 구현하면 된다.
export interface MessageProvider {
  readonly name: string
  send(messages: SolapiMessage[], creds: Credentials | null): Promise<SendResult[]>
}
```

- [ ] **Step 3: SolapiProvider 작성 (기존 solapi.ts 로직을 creds 인자화)**

`src/lib/messaging/providers/SolapiProvider.ts`:
```ts
import 'server-only'
import crypto from 'crypto'
import type { MessageProvider } from './MessageProvider'
import type { SolapiMessage, SendResult, Credentials } from '../types'

const ENDPOINT = 'https://api.solapi.com/messages/v4/send-many/detail'

function authHeader(creds: Credentials): string {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(32).toString('hex')
  const signature = crypto
    .createHmac('sha256', creds.apiSecret)
    .update(date + salt)
    .digest('hex')
  return `HMAC-SHA256 apiKey=${creds.apiKey}, date=${date}, salt=${salt}, signature=${signature}`
}

export class SolapiProvider implements MessageProvider {
  readonly name = 'solapi'

  async send(messages: SolapiMessage[], creds: Credentials | null): Promise<SendResult[]> {
    if (!creds) throw new Error('Solapi 자격증명이 없습니다.')
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: authHeader(creds), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          to: m.to.replace(/[^0-9]/g, ''),
          from: creds.sender,
          text: m.text,
          type: m.type,
        })),
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Solapi 오류 ${res.status}: ${detail}`)
    }
    const json = (await res.json()) as { failedMessageList?: { to: string }[] }
    const failed = new Set((json.failedMessageList ?? []).map((f) => f.to.replace(/[^0-9]/g, '')))
    return messages.map((m) => ({
      to: m.to,
      ok: !failed.has(m.to.replace(/[^0-9]/g, '')),
    }))
  }
}
```

- [ ] **Step 4: MockProvider 작성**

`src/lib/messaging/providers/MockProvider.ts`:
```ts
import type { MessageProvider } from './MessageProvider'
import type { SolapiMessage, SendResult } from '../types'

// 키 미설정 시 dry-run. 실제 발송 없이 콘솔에만 기록한다.
export class MockProvider implements MessageProvider {
  readonly name = 'mock'

  async send(messages: SolapiMessage[]): Promise<SendResult[]> {
    for (const m of messages) {
      console.log(`[messaging:mock] (${m.type}) → ${m.to}: ${m.text}`)
    }
    return messages.map((m) => ({ to: m.to, ok: true }))
  }
}
```

- [ ] **Step 5: MessageService 작성**

`src/lib/messaging/MessageService.ts`:
```ts
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { SolapiProvider } from './providers/SolapiProvider'
import { MockProvider } from './providers/MockProvider'
import type {
  MessageChannel,
  OutgoingMessage,
  BulkSendOutcome,
  SolapiMessage,
  Credentials,
} from './types'

// 본문 길이/채널에 따라 SMS/LMS/ATA 매핑
function toType(channel: MessageChannel, text: string): SolapiMessage['type'] {
  if (channel === 'kakao') return 'ATA'
  return Buffer.byteLength(text, 'utf8') > 90 ? 'LMS' : 'SMS'
}

// DB academy_settings → env 순으로 자격증명 해석. 둘 다 없으면 null(=mock).
async function resolveCredentials(): Promise<Credentials | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('academy_settings')
      .select('solapi_api_key, solapi_api_secret, solapi_sender')
      .eq('id', 1)
      .maybeSingle()
    if (data?.solapi_api_key && data.solapi_api_secret && data.solapi_sender) {
      return {
        apiKey: data.solapi_api_key,
        apiSecret: data.solapi_api_secret,
        sender: data.solapi_sender,
      }
    }
  } catch {
    // 테이블 미적용 등 → env 폴백
  }
  if (process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SOLAPI_SENDER) {
    return {
      apiKey: process.env.SOLAPI_API_KEY,
      apiSecret: process.env.SOLAPI_API_SECRET,
      sender: process.env.SOLAPI_SENDER,
    }
  }
  return null
}

export async function sendBulk(
  channel: MessageChannel,
  messages: OutgoingMessage[]
): Promise<BulkSendOutcome> {
  const valid = messages.filter((m) => m.to.replace(/[^0-9]/g, '').length >= 9)
  const creds = await resolveCredentials()
  const provider = creds ? new SolapiProvider() : new MockProvider()
  const mock = !creds

  const payload: SolapiMessage[] = valid.map((m) => ({
    to: m.to,
    text: m.text,
    type: toType(channel, m.text),
  }))

  try {
    const raw = await provider.send(payload, creds)
    // raw는 to 기준 결과 → ref 다시 부착
    const results = valid.map((m, i) => ({ to: m.to, ref: m.ref, ok: raw[i]?.ok ?? false }))
    return {
      mock,
      results,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length + (messages.length - valid.length),
    }
  } catch (e) {
    return {
      mock,
      results: valid.map((m) => ({ to: m.to, ref: m.ref, ok: false, error: (e as Error).message })),
      sent: 0,
      failed: messages.length,
    }
  }
}
```

- [ ] **Step 6: index.ts를 위임 래퍼로 교체**

`src/lib/messaging/index.ts` 전체를:
```ts
export type { MessageChannel, OutgoingMessage, SendResult, BulkSendOutcome } from './types'
export { sendBulk } from './MessageService'
```

- [ ] **Step 7: 구 solapi.ts 삭제**

`src/lib/messaging/solapi.ts` 삭제(로직은 SolapiProvider로 이전됨). notify.ts는 `@/lib/messaging`의 `sendBulk`/`MessageChannel`만 import하므로 영향 없음.

- [ ] **Step 8: 검증**

Run: `npx tsc --noEmit`
Expected: 통과(TSC_OK). notify.ts가 동일 시그니처 sendBulk 사용 확인.

---

## Task 3: 외부 서비스 연동 설정 페이지 (/admin/settings)

**Files:**
- Create: `src/lib/settings.ts`, `src/app/actions/settings.ts`, `src/app/admin/settings/page.tsx`, `src/app/admin/settings/_components/SettingsForm.tsx`
- Modify: `src/components/layout/nav.ts`

- [ ] **Step 1: 공유 타입/마스킹 헬퍼**

`src/lib/settings.ts`:
```ts
// 설정 페이지 표시용. secret 원문은 클라이언트로 보내지 않고 '설정됨' 여부만.
export type MessagingSettingsView = {
  sender: string
  apiKeySet: boolean
  apiSecretSet: boolean
  kakaoPfId: string
}
```

- [ ] **Step 2: settings 액션**

`src/app/actions/settings.ts`:
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import type { MessagingSettingsView } from '@/lib/settings'

export type SettingsFormState = { error?: string; ok?: boolean } | undefined

export async function getMessagingSettings(): Promise<MessagingSettingsView> {
  const empty: MessagingSettingsView = { sender: '', apiKeySet: false, apiSecretSet: false, kakaoPfId: '' }
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return empty
  }
  const { data } = await supabase
    .from('academy_settings')
    .select('solapi_api_key, solapi_api_secret, solapi_sender, kakao_pf_id')
    .eq('id', 1)
    .maybeSingle()
  if (!data) return empty
  return {
    sender: data.solapi_sender ?? '',
    apiKeySet: Boolean(data.solapi_api_key),
    apiSecretSet: Boolean(data.solapi_api_secret),
    kakaoPfId: data.kakao_pf_id ?? '',
  }
}

export async function saveMessagingSettings(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  let supabase, userId
  try {
    const ctx = await requireAdmin()
    supabase = ctx.supabase
    userId = ctx.user.id
  } catch (e) {
    return { error: (e as Error).message }
  }

  const apiKey = String(formData.get('apiKey') ?? '').trim()
  const apiSecret = String(formData.get('apiSecret') ?? '').trim()
  const sender = String(formData.get('sender') ?? '').trim()
  const kakaoPfId = String(formData.get('kakaoPfId') ?? '').trim()

  // 빈 값으로 들어온 key/secret은 기존 값 유지(마스킹 입력 안 바꿈)
  const patch: Record<string, unknown> = { id: 1, solapi_sender: sender, kakao_pf_id: kakaoPfId, updated_by: userId, updated_at: new Date().toISOString() }
  if (apiKey) patch.solapi_api_key = apiKey
  if (apiSecret) patch.solapi_api_secret = apiSecret

  const { error } = await supabase.from('academy_settings').upsert(patch, { onConflict: 'id' })
  if (error) return { error: '설정 저장에 실패했습니다. (0010 마이그레이션 적용 여부 확인)' }

  revalidatePath('/admin/settings')
  return { ok: true }
}
```

- [ ] **Step 3: SettingsForm 컴포넌트**

`src/app/admin/settings/_components/SettingsForm.tsx` — `'use client'`. `useActionState(saveMessagingSettings)`.
입력: sender(text), apiKey(password, placeholder=apiKeySet?'••••(설정됨, 변경 시에만 입력)':''), apiSecret(동일), kakaoPfId(text).
연결 상태 배지: `apiKeySet && apiSecretSet && sender` → 초록 '연결됨' / 아니면 회색 '미설정'.
저장 버튼은 `AnimationButton type="submit"`. 스타일은 AnnouncementManager.CreateModal의 inputCls 패턴 재사용:
```tsx
const inputCls = 'h-10 w-full rounded-lg border border-cream-line bg-white px-3 font-pretendard text-sm outline-none focus:border-brand/40 dark:border-zinc-700 dark:bg-zinc-900'
```
성공 시 `state.ok` → '저장되었습니다' 안내. 비밀번호 필드 2개는 입력 시에만 갱신(빈값=유지) — 안내문 포함.

- [ ] **Step 4: 설정 페이지(서버)**

`src/app/admin/settings/page.tsx`:
```tsx
import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { getMessagingSettings } from '@/app/actions/settings'
import { SettingsForm } from './_components/SettingsForm'

export default async function SettingsPage() {
  const { profile } = await requireAdmin()
  const settings = await getMessagingSettings()
  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <div className="mx-auto max-w-2xl">
          <h1 className="font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">학원 설정</h1>
          <p className="mt-1 font-pretendard text-sm text-brand/60 dark:text-zinc-400">외부 서비스 연동 · 문자/알림톡 발송</p>
          <SettingsForm initial={settings} />
        </div>
      </AdminGuard>
    </AppShell>
  )
}
```
주의: `requireAdmin()`가 `profile` 반환하는지 기존 사용처(admin/announcements/page.tsx) 확인 후 동일 패턴 사용. 반환 형태가 다르면 그 페이지 패턴 그대로 복제.

- [ ] **Step 5: nav 추가**

`src/components/layout/nav.ts`의 `ADMIN_GROUP.children`에 항목 추가(기존 객체 형태 그대로):
```ts
{ href: '/admin/messages', label: '메시지 발송', icon: '✉️' },
{ href: '/admin/settings', label: '학원 설정', icon: '⚙️' },
```
(정확한 필드명은 파일 읽고 기존 항목과 일치시킬 것 — label/href/icon 추정.)

- [ ] **Step 6: 검증**

Run: `npx tsc --noEmit`
Expected: 통과.

---

## Task 4: 타겟팅 메시지 발송 (/admin/messages)

**Files:**
- Create: `src/app/actions/messages.ts`, `src/app/admin/messages/page.tsx`, `src/app/admin/messages/_components/MessageComposer.tsx`

- [ ] **Step 1: 발송 액션**

`src/app/actions/messages.ts`:
```ts
'use server'

import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBulk, type MessageChannel } from '@/lib/messaging'

export type SendMessageInput = {
  studentIds: string[]
  channel: MessageChannel
  recipient: 'parent' | 'student'
  message: string
}

export type SendMessageResult = {
  ok: boolean
  error?: string
  mock?: boolean
  sent?: number
  failed?: number
}

export async function sendTargetedMessage(input: SendMessageInput): Promise<SendMessageResult> {
  let userId
  try {
    ;({ user: { id: userId } } = (await requireAdmin()) as { user: { id: string } })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
  if (input.studentIds.length === 0) return { ok: false, error: '받는 학생을 선택하세요.' }
  if (input.message.trim() === '') return { ok: false, error: '메시지 내용을 입력하세요.' }

  // 원장 권한 → 전 학생 대상. service role로 실번호 조회.
  const admin = createAdminClient()
  const { data: students } = await admin
    .from('students')
    .select('id, name, student_phone, parent_phone')
    .in('id', input.studentIds)

  if (!students || students.length === 0) return { ok: false, error: '대상 학생을 찾을 수 없습니다.' }

  const messages = students.map((s) => {
    const phone =
      input.recipient === 'parent'
        ? s.parent_phone || s.student_phone
        : s.student_phone || s.parent_phone
    const text = input.message.replaceAll('{이름}', s.name).replaceAll('{name}', s.name)
    return { to: phone ?? '', text, ref: s.id }
  })

  const outcome = await sendBulk(input.channel, messages)

  const byId = new Map(students.map((s) => [s.id, s]))
  const logRows = outcome.results.map((r) => {
    const s = byId.get(r.ref ?? '')
    return {
      channel: input.channel,
      recipient: input.recipient,
      student_id: s?.id ?? null,
      to_phone: r.to,
      message: input.message.replaceAll('{이름}', s?.name ?? '').replaceAll('{name}', s?.name ?? ''),
      ok: r.ok,
      sent_by: userId,
    }
  })
  if (logRows.length > 0) {
    const { supabase } = await requireAdmin()
    await supabase.from('message_log').insert(logRows)
  }

  return { ok: true, mock: outcome.mock, sent: outcome.sent, failed: outcome.failed }
}
```
주의: `requireAdmin()` 반환 구조(user/supabase/profile)를 기존 notify.ts/announcements.ts에서 확인하고 구조분해를 정확히 맞출 것. 위 `as` 캐스팅은 실제 타입 확인 후 정리.

- [ ] **Step 2: 발송 페이지(서버) — 반별 학생 조회**

`src/app/admin/messages/page.tsx`:
```tsx
import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { MessageComposer } from './_components/MessageComposer'

export default async function MessagesPage() {
  const { supabase, profile } = await requireAdmin()
  // students_view 사용(원장은 실값). 반 이름 포함 위해 classes 조인 or 별도 맵.
  const { data: classes } = await supabase.from('classes').select('id, name').order('name')
  const { data: students } = await supabase
    .from('students_view')
    .select('id, name, grade, class_id, status')
    .order('name')
  const active = (students ?? []).filter((s) => s.status === 'ACTIVE')
  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <h1 className="font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">메시지 발송</h1>
        <p className="mt-1 font-pretendard text-sm text-brand/60 dark:text-zinc-400">학생을 선택해 문자·알림톡을 보냅니다.</p>
        <MessageComposer classes={classes ?? []} students={active} />
      </AdminGuard>
    </AppShell>
  )
}
```
주의: `students_view` 컬럼명(class_id/status/grade)은 단계 8/17에서 추가됨 — 실제 뷰 정의 확인 후 select 조정.

- [ ] **Step 3: MessageComposer (체크박스 타겟팅 + 발송 모달)**

`src/app/admin/messages/_components/MessageComposer.tsx` — `'use client'`. 핵심 로직:
```tsx
'use client'
import { useMemo, useState, useTransition } from 'react'
import { sendTargetedMessage, type SendMessageResult } from '@/app/actions/messages'
import { AnimationButton } from '@/components/ui/AnimationButton'

type ClassRow = { id: string; name: string }
type StudentRow = { id: string; name: string; grade: string | null; class_id: string | null }

export function MessageComposer({ classes, students }: { classes: ClassRow[]; students: StudentRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)

  const byClass = useMemo(() => {
    const m = new Map<string, StudentRow[]>()
    for (const s of students) {
      const k = s.class_id ?? 'none'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(s)
    }
    return m
  }, [students])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const toggleAll = () =>
    setSelected((prev) => (prev.size === students.length ? new Set() : new Set(students.map((s) => s.id))))
  const toggleClass = (cid: string) =>
    setSelected((prev) => {
      const ids = (byClass.get(cid) ?? []).map((s) => s.id)
      const allOn = ids.every((id) => prev.has(id))
      const n = new Set(prev)
      ids.forEach((id) => (allOn ? n.delete(id) : n.add(id)))
      return n
    })

  // 렌더: 전체선택 체크박스 + 반별 그룹(반 헤더에 '반전체' 체크박스) + 개별 체크박스.
  // 미배정(class_id=none)은 '미배정' 그룹. 선택 N명 요약 + [메시지 발송] 버튼(disabled: selected.size===0) → setOpen(true).
  // 모달: SendModal(아래) 렌더.
  // ... (그룹 렌더 JSX는 기존 StudentAdminTable 그룹 패턴 참고, font-pretendard, cream/brand 테마)
  return (/* 위 설명대로의 JSX */ null) as any
}
```
실제 구현 시: 반 헤더 행에 `반전체` 체크박스(`indeterminate`는 ref로 설정), 학생 행에 개별 체크박스. 상단 sticky 바에 `전체 선택`/`선택 N명`/`AnimationButton`(발송). 발송 모달은 같은 파일 하위 컴포넌트 `SendModal`:
```tsx
function SendModal({ count, studentIds, onClose }: { count: number; studentIds: string[]; onClose: () => void }) {
  const [channel, setChannel] = useState<'sms' | 'kakao'>('sms')
  const [recipient, setRecipient] = useState<'parent' | 'student'>('parent')
  const [message, setMessage] = useState('')
  const [pending, start] = useTransition()
  const [result, setResult] = useState<SendMessageResult | null>(null)

  const submit = () =>
    start(async () => {
      const r = await sendTargetedMessage({ studentIds, channel, recipient, message })
      setResult(r)
    })

  // 모달 레이아웃: AnnouncementManager.CreateModal 패턴(fixed inset-0 bg-black/50, 카드).
  // 채널 토글(문자/카카오), 수신대상 토글(학부모/학생), textarea(message, placeholder '{이름} 사용 가능'),
  // 결과 표시(result.mock?'(테스트 발송)':''+`성공 ${sent} / 실패 ${failed}`), AnimationButton 발송.
  return null as any
}
```

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit` → 통과.
Run(선택): dev에서 /admin/messages 진입, 학생 선택 → 발송 → mock이면 터미널에 `[messaging:mock]` 로그 + 결과 '(테스트 발송) 성공 N'.

---

## Task 5: 공지 확장 (반 타겟 + WYSIWYG + 팝업 렌더)

**Files:**
- Create: `src/lib/sanitize-html.ts`, `src/components/ui/RichTextEditor.tsx`
- Modify: `src/lib/announcements.ts`, `src/app/actions/announcements.ts`, `src/app/admin/announcements/_components/AnnouncementManager.tsx`, `src/app/admin/announcements/page.tsx`, `src/components/announcements/AnnouncementPopup.tsx`

- [ ] **Step 1: sanitize 유틸**

`src/lib/sanitize-html.ts`:
```ts
// 서버측 allowlist sanitize. 작성자=신뢰된 원장이지만 방어적으로 위험 요소 제거.
const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'P', 'BR', 'UL', 'OL', 'LI', 'H2', 'H3', 'A'])

export function sanitizeHtml(input: string): string {
  let html = input
  // script/style 블록 제거
  html = html.replace(/<\/?(script|style)[^>]*>/gi, '')
  // on* 이벤트 핸들러 속성 제거
  html = html.replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '')
  // javascript: URL 제거
  html = html.replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"')
  // 허용되지 않은 태그 제거(여는/닫는 태그명만 검사)
  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (m, tag) =>
    ALLOWED.has(String(tag).toUpperCase()) ? m : ''
  )
  return html
}
```
주의: 완전한 sanitizer는 아님(신뢰된 단일 작성자 전제). 외부 입력에 쓰지 말 것.

- [ ] **Step 2: RichTextEditor (contentEditable)**

`src/components/ui/RichTextEditor.tsx` — `'use client'`:
```tsx
'use client'
import { useRef } from 'react'

const TOOLS: { cmd: string; label: string; arg?: string }[] = [
  { cmd: 'bold', label: '굵게' },
  { cmd: 'italic', label: '기울임' },
  { cmd: 'underline', label: '밑줄' },
  { cmd: 'insertUnorderedList', label: '• 목록' },
  { cmd: 'insertOrderedList', label: '1. 목록' },
  { cmd: 'formatBlock', label: '제목', arg: 'H3' },
]

// name으로 hidden input에 HTML을 실어 form action으로 전송. defaultValue로 수정 지원.
export function RichTextEditor({ name, defaultValue = '' }: { name: string; defaultValue?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const hiddenRef = useRef<HTMLInputElement>(null)

  const sync = () => {
    if (hiddenRef.current && ref.current) hiddenRef.current.value = ref.current.innerHTML
  }
  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg)
    ref.current?.focus()
    sync()
  }

  return (
    <div className="rounded-lg border border-cream-line dark:border-zinc-700">
      <div className="flex flex-wrap gap-1 border-b border-cream-line p-2 dark:border-zinc-700">
        {TOOLS.map((t) => (
          <button
            key={t.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(t.cmd, t.arg)}
            className="rounded-md px-2 py-1 font-pretendard text-xs text-brand hover:bg-brand-tint dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        dangerouslySetInnerHTML={{ __html: defaultValue }}
        className="min-h-32 p-3 font-pretendard text-sm outline-none [&_h3]:font-paperozi [&_h3]:text-base [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      />
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue} />
    </div>
  )
}
```
주의: `document.execCommand`는 deprecated이나 광범위 지원·의존성 0이라 채택(요구된 경량 방식). `onMouseDown preventDefault`로 포커스 유지.

- [ ] **Step 3: Announcement 타입 확장**

`src/lib/announcements.ts`의 `Announcement` 타입에 추가(기존 필드 유지):
```ts
target?: 'all' | 'class'
class_id?: string | null
body_html?: string | null
```

- [ ] **Step 4: createAnnouncement 액션 확장**

`src/app/actions/announcements.ts` 수정 — zod schema에 target/class 추가, insert에 컬럼 추가, body_html sanitize:
```ts
import { sanitizeHtml } from '@/lib/sanitize-html'
// schema 확장
const schema = z.object({
  title: z.string().trim().min(1, { message: '제목을 입력하세요.' }),
  body: z.string().trim().min(1, { message: '본문을 입력하세요.' }),
  target: z.enum(['all', 'class']).default('all'),
  class_id: z.string().uuid().optional().nullable(),
})
```
파싱부:
```ts
const target = (formData.get('target') as string) === 'class' ? 'class' : 'all'
const classId = target === 'class' ? (formData.get('class_id') as string) || null : null
if (target === 'class' && !classId) return { error: '대상 반을 선택하세요.' }
const bodyHtmlRaw = String(formData.get('body_html') ?? '')
const bodyHtml = bodyHtmlRaw ? sanitizeHtml(bodyHtmlRaw) : null
```
insert에 `target, class_id: classId, body_html: bodyHtml` 추가. `body`는 기존대로 평문(폴백) — `body_html`에서 태그 제거한 텍스트 또는 별도 textarea 유지. **결정: body textarea는 제거하고 body는 `bodyHtmlRaw`에서 텍스트만 추출해 채움**(검색/폴백용):
```ts
const bodyText = bodyHtmlRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
// schema의 body 검증은 bodyText로 수행하도록 safeParse 입력 변경
```
주의: 0010 미적용 시 insert가 target/body_html 컬럼 없어 실패 → graceful 에러 메시지 유지.

- [ ] **Step 5: AnnouncementManager UI 확장**

`src/app/admin/announcements/_components/AnnouncementManager.tsx`의 `CreateModal` 폼 수정:
- props로 `classes: {id;name}[]` 받기(상위에서 전달).
- 대상 토글: 라디오/세그먼트 `통합 공지`(target=all) / `특정 반`(target=class). hidden/state로 `target` 전송.
- target='class'면 반 select(name='class_id') 노출.
- 기존 `<textarea name="body">`를 `<RichTextEditor name="body_html" />`로 교체.
- AnnouncementManager 컴포넌트도 `classes` prop 받아 CreateModal에 전달.
- 목록 Row에 target='class'면 반 이름 라벨 칩 표시.

- [ ] **Step 6: announcements 페이지에서 classes 전달**

`src/app/admin/announcements/page.tsx`에서 `supabase.from('classes').select('id,name').order('name')` 조회 후 `<AnnouncementManager announcements={...} classes={classes ?? []} />`.

- [ ] **Step 7: 팝업 렌더 (body_html + 반 라벨)**

`src/components/announcements/AnnouncementPopup.tsx`: 기존 본문 텍스트 출력부를:
```tsx
{a.body_html ? (
  <div
    className="font-pretendard text-sm leading-relaxed [&_h3]:font-paperozi [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
    dangerouslySetInnerHTML={{ __html: a.body_html }}
  />
) : (
  <p className="whitespace-pre-wrap font-pretendard text-sm">{a.body}</p>
)}
```
`a.target === 'class'`면 제목 근처에 반 라벨 칩(반 이름은 팝업 데이터에 없으면 생략 또는 '특정 반 공지' 라벨). getActiveAnnouncement select에 `target, class_id, body_html` 추가.
주의: body_html은 createAnnouncement에서 이미 sanitize됨 → 저장 시점 신뢰. 그래도 표시 컴포넌트 주석에 출처 명시.

- [ ] **Step 8: 검증**

Run: `npx tsc --noEmit` → 통과.
Run: `npx next build` → 통과(16+ 라우트, /admin/messages·/admin/settings 추가).

---

## Task 6: 최종 검증 + 적용 안내

- [ ] **Step 1: 전체 빌드**

Run: `npx next build`
Expected: ✓ Compiled successfully, TypeScript 통과, 신규 라우트 `/admin/messages` `/admin/settings` 등장.

- [ ] **Step 2: mock 발송 스모크(선택, dev 필요)**

dev 서버에서 owner 계정 로그인 → /admin/messages → 학생 선택 → 발송 → 터미널 `[messaging:mock]` 로그 확인.
키 설정 시: /admin/settings에 솔라피 키 입력 → 저장 → 재발송 시 실제 API 경로.

- [ ] **Step 3: 사용자 적용 안내(보고)**

최종 메시지에 포함:
- Supabase SQL Editor에서 `0010_notices_messaging.sql` 실행 필요(미적용 시 공지 확장/설정/메시지 로그 비활성, 앱은 graceful).
- 실제 발송은 /admin/settings에 솔라피 Key/Secret/발신번호 입력 후 동작(미입력 시 mock).

---

## Self-Review

- **Spec coverage:**
  - 통합/특정반 공지 + WYSIWYG → Task 5 ✓
  - Notices 저장 = announcements 확장 → Task 1·5 ✓
  - 메인 팝업 연동 → Task 5 Step 7 ✓
  - 타겟팅 발송 UI(전체/반별/개별 체크박스) → Task 4 Step 3 ✓
  - SMS/카카오 + 발송 폼 모달 → Task 4 Step 3 SendModal ✓
  - 설정 페이지(API Key 입력) → Task 3 ✓
  - MessageService 서비스 패턴 분리 → Task 2 ✓
- **Placeholder scan:** Task 4 Step 3의 JSX는 `null as any` 골격 + 명시된 로직 설명 — 실제 구현 시 기존 StudentAdminTable/CreateModal 패턴을 따른다고 지정. execution 시 완성 필요(설명 충분).
- **Type consistency:** `sendBulk(channel, OutgoingMessage[])→BulkSendOutcome` 시그니처가 Task2·4·notify.ts에서 일치. `Credentials`/`SolapiMessage` types.ts 단일 정의. `MessagingSettingsView` settings.ts 단일 정의.
- **주의 공통:** `requireAdmin()`/`requireApproved()` 반환 구조(user/supabase/profile)는 execution 시 `src/lib/auth.ts` 실제 정의 확인 후 구조분해 정확히 맞출 것(계획의 캐스팅 `as`는 임시).
