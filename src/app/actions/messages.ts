'use server'

import { requirePermission } from '@/lib/auth'
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

// 원장 전용 타겟팅 발송.
// UI엔 전화번호를 노출하지 않고, 서버에서 service role 로 실번호를 조회해 발송한다.
// 원장 권한이므로 전 학생을 대상으로 할 수 있다(담당 반 제한 없음).
export async function sendTargetedMessage(input: SendMessageInput): Promise<SendMessageResult> {
  let supabase
  let userId
  let isAdmin = false
  try {
    const ctx = await requirePermission('messaging')
    supabase = ctx.supabase
    userId = ctx.user.id
    isAdmin = ctx.isAdmin
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  if (input.studentIds.length === 0) return { ok: false, error: '받는 학생을 선택하세요.' }
  if (input.message.trim() === '') return { ok: false, error: '메시지 내용을 입력하세요.' }

  // 비원장은 담당 반(ACTIVE) 학생에게만 발송 가능 — 사용자 컨텍스트 RLS로 스코프 강제.
  if (!isAdmin) {
    const { data: allowed } = await supabase
      .from('students')
      .select('id')
      .in('id', input.studentIds)
    const allowedIds = new Set((allowed ?? []).map((s) => s.id))
    if (input.studentIds.some((id) => !allowedIds.has(id))) {
      return { ok: false, error: '담당 반 학생에게만 발송할 수 있습니다.' }
    }
  }

  const admin = createAdminClient()
  const { data: students } = await admin
    .from('students')
    .select('id, name, student_phone, parent_phone')
    .in('id', input.studentIds)

  if (!students || students.length === 0) {
    return { ok: false, error: '대상 학생을 찾을 수 없습니다.' }
  }

  const render = (name: string) =>
    input.message.replaceAll('{이름}', name).replaceAll('{name}', name)

  const messages = students.map((s) => {
    const phone =
      input.recipient === 'parent'
        ? s.parent_phone || s.student_phone
        : s.student_phone || s.parent_phone
    return { to: phone ?? '', text: render(s.name), ref: s.id }
  })

  const outcome = await sendBulk(input.channel, messages)

  // 발송 결과를 message_log 에 기록 (RLS: admin 통과)
  const byId = new Map(students.map((s) => [s.id, s]))
  const logRows = outcome.results.map((r) => {
    const s = byId.get(r.ref ?? '')
    return {
      channel: input.channel,
      recipient: input.recipient,
      student_id: s?.id ?? null,
      to_phone: r.to,
      message: render(s?.name ?? ''),
      ok: r.ok,
      sent_by: userId,
    }
  })
  if (logRows.length > 0) {
    await supabase.from('message_log').insert(logRows)
  }

  return { ok: true, mock: outcome.mock, sent: outcome.sent, failed: outcome.failed }
}
