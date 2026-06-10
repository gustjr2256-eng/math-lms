'use server'

import { requireApproved } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBulk, type MessageChannel } from '@/lib/messaging'

export type NotifyInput = {
  homeworkId: string
  classId: string
  studentIds: string[]
  message: string
  channel: MessageChannel
  recipient: 'parent' | 'student'
}

export type NotifyResult = {
  ok: boolean
  error?: string
  mock?: boolean
  sent?: number
  failed?: number
}

// 미제출자 알림 발송.
// 강사 UI엔 전화번호를 노출하지 않고, 서버에서 service role로 실번호를 조회해 발송한다.
export async function sendNotifications(input: NotifyInput): Promise<NotifyResult> {
  let supabase, user
  try {
    ;({ supabase, user } = await requireApproved())
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  if (input.studentIds.length === 0) return { ok: false, error: '받는 학생을 선택하세요.' }
  if (input.message.trim() === '') return { ok: false, error: '메시지 내용을 입력하세요.' }

  // 담당 권한 검증: 이 숙제를 볼 수 있어야 함(RLS).
  const { data: hw } = await supabase
    .from('homework')
    .select('id, class_id')
    .eq('id', input.homeworkId)
    .maybeSingle()
  if (!hw || hw.class_id !== input.classId) {
    return { ok: false, error: '권한이 없거나 잘못된 요청입니다.' }
  }

  // 실번호 조회는 service role. 단, 반드시 담당 반(class_id) 학생으로 한정.
  const admin = createAdminClient()
  const { data: students } = await admin
    .from('students')
    .select('id, name, student_phone, parent_phone')
    .eq('class_id', hw.class_id)
    .in('id', input.studentIds)

  if (!students || students.length === 0) {
    return { ok: false, error: '대상 학생을 찾을 수 없습니다.' }
  }

  const messages = students.map((s) => {
    const phone =
      input.recipient === 'parent'
        ? s.parent_phone || s.student_phone
        : s.student_phone || s.parent_phone
    const text = input.message.replaceAll('{이름}', s.name).replaceAll('{name}', s.name)
    return { to: phone ?? '', text, ref: s.id }
  })

  const outcome = await sendBulk(input.channel, messages)

  // 발송 성공 건을 notification_log 에 기록 (RLS: 담당 반 통과)
  const sentRefs = new Set(outcome.results.filter((r) => r.ok).map((r) => r.ref))
  const logRows = students
    .filter((s) => sentRefs.has(s.id))
    .map((s) => ({
      homework_id: input.homeworkId,
      student_id: s.id,
      type: input.channel,
      message: input.message.replaceAll('{이름}', s.name).replaceAll('{name}', s.name),
      sent_by: user.id,
    }))

  if (logRows.length > 0) {
    await supabase.from('notification_log').insert(logRows)
  }

  return { ok: true, mock: outcome.mock, sent: outcome.sent, failed: outcome.failed }
}
