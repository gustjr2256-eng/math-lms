'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth'

export type ProgressFormState = { error?: string; ok?: boolean } | undefined

const optionalInt = z
  .union([z.literal(''), z.coerce.number().int().nonnegative()])
  .transform((v) => (v === '' ? null : v))

const schema = z.object({
  class_id: z.string().uuid(),
  date: z.string().min(1, { message: '날짜를 선택하세요.' }),
  textbook: z.string().trim().min(1, { message: '교재명을 입력하세요.' }),
  chapter: z.string().trim().optional(),
  page_from: optionalInt,
  page_to: optionalInt,
  memo: z.string().trim().optional(),
})

// 진도 기록 추가 — 원장 또는 담당 강사.
export async function addProgress(
  _prev: ProgressFormState,
  formData: FormData
): Promise<ProgressFormState> {
  let supabase
  try {
    ;({ supabase } = await requirePermission('progress'))
  } catch (e) {
    return { error: (e as Error).message }
  }

  const parsed = schema.safeParse({
    class_id: formData.get('class_id'),
    date: formData.get('date'),
    textbook: formData.get('textbook'),
    chapter: formData.get('chapter') ?? undefined,
    page_from: formData.get('page_from') ?? '',
    page_to: formData.get('page_to') ?? '',
    memo: formData.get('memo') ?? undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const { error } = await supabase.from('progress').insert({
    class_id: parsed.data.class_id,
    date: parsed.data.date,
    textbook: parsed.data.textbook,
    chapter: parsed.data.chapter || null,
    page_from: parsed.data.page_from,
    page_to: parsed.data.page_to,
    memo: parsed.data.memo || null,
  })
  if (error) return { error: '등록 권한이 없거나 입력이 올바르지 않습니다.' }

  revalidatePath(`/classes/${parsed.data.class_id}/progress`)
  revalidatePath(`/classes/${parsed.data.class_id}`)
  return { ok: true }
}

export async function deleteProgress(formData: FormData) {
  const { supabase } = await requirePermission('progress')
  const id = formData.get('id')
  const classId = formData.get('class_id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  const { error } = await supabase.from('progress').delete().eq('id', id)
  if (error) throw new Error(error.message)

  if (typeof classId === 'string' && classId) revalidatePath(`/classes/${classId}/progress`)
}
