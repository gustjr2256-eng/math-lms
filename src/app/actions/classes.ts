'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'

export type ClassFormState = { error?: string; ok?: boolean } | undefined

const classSchema = z.object({
  name: z.string().trim().min(1, { message: '반 이름을 입력하세요.' }),
  subject: z.string().trim().min(1, { message: '과목을 입력하세요.' }),
  day_of_week: z.string().trim().min(1, { message: '요일을 입력하세요.' }),
  time: z.string().trim().min(1, { message: '시간을 입력하세요.' }),
  teacher_id: z.string().uuid({ message: '담당 강사를 선택하세요.' }),
})

// 반 생성 — 원장 전용. 담당 강사 지정 포함.
export async function createClass(
  _prev: ClassFormState,
  formData: FormData
): Promise<ClassFormState> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch (e) {
    return { error: (e as Error).message }
  }

  const parsed = classSchema.safeParse({
    name: formData.get('name'),
    subject: formData.get('subject'),
    day_of_week: formData.get('day_of_week'),
    time: formData.get('time'),
    teacher_id: formData.get('teacher_id'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const { error } = await supabase.from('classes').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/classes')
  revalidatePath('/admin/students') // 반 생성 폼이 이 페이지로 이동 + 반 배정 드롭다운 갱신
  return { ok: true }
}

// 반 수정 — 원장 전용.
export async function updateClass(
  _prev: ClassFormState,
  formData: FormData
): Promise<ClassFormState> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch (e) {
    return { error: (e as Error).message }
  }

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) return { error: '대상이 올바르지 않습니다.' }

  const parsed = classSchema.safeParse({
    name: formData.get('name'),
    subject: formData.get('subject'),
    day_of_week: formData.get('day_of_week'),
    time: formData.get('time'),
    teacher_id: formData.get('teacher_id'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const { error } = await supabase.from('classes').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/classes')
  revalidatePath(`/classes/${id}`)
  revalidatePath('/admin/students')
  return { ok: true }
}

// 반 삭제 — 원장 전용. (소속 학생의 class_id는 set null 됨)
export async function deleteClass(formData: FormData) {
  const { supabase } = await requireAdmin()
  const id = formData.get('id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  const { error } = await supabase.from('classes').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/classes')
  revalidatePath('/admin/students')
}
