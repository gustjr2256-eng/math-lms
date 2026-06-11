'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireApproved } from '@/lib/auth'
import { COLOR_KEYS } from '@/lib/calendar'

export type ScheduleFormState = { error?: string; ok?: boolean } | undefined

const schema = z
  .object({
    title: z.string().trim().min(1, { message: '일정 제목을 입력하세요.' }),
    type: z.enum(['period', 'single']),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: '시작일을 선택하세요.' }),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    color: z.enum(COLOR_KEYS as [string, ...string[]]),
    memo: z.string().trim().optional(),
  })
  .transform((d) => ({
    ...d,
    // 단일 일정은 종료일을 시작일로 강제한다.
    end_date: d.type === 'single' ? d.start_date : d.end_date || d.start_date,
  }))
  .refine((d) => d.end_date >= d.start_date, {
    message: '종료일이 시작일보다 빠를 수 없습니다.',
    path: ['end_date'],
  })

function parse(formData: FormData) {
  return schema.safeParse({
    title: formData.get('title'),
    type: formData.get('type'),
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date') ?? undefined,
    color: formData.get('color'),
    memo: formData.get('memo') ?? undefined,
  })
}

export async function createSchedule(
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  let supabase
  let userId
  try {
    const ctx = await requireApproved()
    supabase = ctx.supabase
    userId = ctx.user.id
  } catch (e) {
    return { error: (e as Error).message }
  }

  const parsed = parse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const { error } = await supabase.from('academy_schedules').insert({
    title: parsed.data.title,
    type: parsed.data.type,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    color: parsed.data.color,
    memo: parsed.data.memo || null,
    created_by: userId,
  })
  if (error) return { error: '일정 등록에 실패했습니다.' }

  // 기간제일 때, 함께 입력한 '기간 내 특정일'들을 single 일정으로 일괄 생성
  if (parsed.data.type === 'period') {
    await insertChildEvents(
      supabase,
      formData,
      parsed.data.start_date,
      parsed.data.end_date,
      parsed.data.color,
      userId
    )
  }

  revalidatePath('/calendar')
  return { ok: true }
}

export async function updateSchedule(
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  let supabase
  let userId
  try {
    const ctx = await requireApproved()
    supabase = ctx.supabase
    userId = ctx.user.id
  } catch (e) {
    return { error: (e as Error).message }
  }

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) return { error: '대상이 올바르지 않습니다.' }

  const parsed = parse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  // RLS가 작성자/원장만 통과시킨다.
  const { error } = await supabase
    .from('academy_schedules')
    .update({
      title: parsed.data.title,
      type: parsed.data.type,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      color: parsed.data.color,
      memo: parsed.data.memo || null,
    })
    .eq('id', id)
  if (error) return { error: '수정 권한이 없거나 입력이 올바르지 않습니다.' }

  // 수정 시에도 기간제면 '기간 내 특정일'을 추가로 생성할 수 있다.
  if (parsed.data.type === 'period') {
    await insertChildEvents(
      supabase,
      formData,
      parsed.data.start_date,
      parsed.data.end_date,
      parsed.data.color,
      userId
    )
  }

  revalidatePath('/calendar')
  return { ok: true }
}

// 기간제 일정에 함께 입력한 '기간 내 특정일'들을 single 일정으로 일괄 생성한다.
// (같은 색상을 상속해 캘린더에서 기간 막대 위에 겹쳐 표시됨)
async function insertChildEvents(
  supabase: Awaited<ReturnType<typeof requireApproved>>['supabase'],
  formData: FormData,
  startDate: string,
  endDate: string,
  color: string,
  userId: string
) {
  const raw = formData.get('events')
  if (typeof raw !== 'string' || !raw.trim()) return

  let events: { date?: string; title?: string }[] = []
  try {
    events = JSON.parse(raw)
  } catch {
    events = []
  }

  const rows = (Array.isArray(events) ? events : [])
    .filter(
      (e) =>
        typeof e?.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        e.date >= startDate &&
        e.date <= endDate &&
        typeof e?.title === 'string' &&
        e.title.trim().length > 0
    )
    .map((e) => ({
      title: e.title!.trim(),
      type: 'single' as const,
      start_date: e.date!,
      end_date: e.date!,
      color,
      memo: null,
      created_by: userId,
    }))

  if (rows.length > 0) {
    await supabase.from('academy_schedules').insert(rows)
  }
}

export async function deleteSchedule(formData: FormData) {
  const { supabase } = await requireApproved()
  const id = formData.get('id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  const { error } = await supabase.from('academy_schedules').delete().eq('id', id)
  if (error) throw new Error('삭제 권한이 없습니다.')

  revalidatePath('/calendar')
}
