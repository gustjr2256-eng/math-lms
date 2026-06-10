'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireApproved } from '@/lib/auth'

export type StudentFormState = { error?: string; ok?: boolean } | undefined

// 전화번호는 원장만 의미가 있다(강사가 보내도 DB 트리거가 무시).
const studentSchema = z.object({
  name: z.string().trim().min(1, { message: '학생 이름을 입력하세요.' }),
  grade: z.string().trim().min(1, { message: '학년을 입력하세요.' }),
  class_id: z.string().uuid({ message: '반이 올바르지 않습니다.' }),
  student_phone: z.string().trim().optional(),
  parent_phone: z.string().trim().optional(),
  memo: z.string().trim().optional(),
})

function parse(formData: FormData) {
  return studentSchema.safeParse({
    name: formData.get('name'),
    grade: formData.get('grade'),
    class_id: formData.get('class_id'),
    student_phone: formData.get('student_phone') ?? undefined,
    parent_phone: formData.get('parent_phone') ?? undefined,
    memo: formData.get('memo') ?? undefined,
  })
}

// 학생 등록 — 원장 또는 담당 강사. RLS가 타 반 배정을 차단한다.
export async function addStudent(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  let supabase
  try {
    ;({ supabase } = await requireApproved())
  } catch (e) {
    return { error: (e as Error).message }
  }

  const parsed = parse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const { error } = await supabase.from('students').insert({
    name: parsed.data.name,
    grade: parsed.data.grade,
    class_id: parsed.data.class_id,
    student_phone: parsed.data.student_phone || null,
    parent_phone: parsed.data.parent_phone || null,
    memo: parsed.data.memo || null,
  })
  if (error) {
    return { error: '등록 권한이 없거나 입력이 올바르지 않습니다.' }
  }

  revalidatePath(`/classes/${parsed.data.class_id}`)
  return { ok: true }
}

// 학생 수정 — 원장 또는 담당 강사.
export async function updateStudent(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  let supabase
  try {
    ;({ supabase } = await requireApproved())
  } catch (e) {
    return { error: (e as Error).message }
  }

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) return { error: '대상이 올바르지 않습니다.' }

  const parsed = parse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  // 전화번호는 강사가 보내도 트리거가 무시하므로 그대로 전달.
  const { error } = await supabase
    .from('students')
    .update({
      name: parsed.data.name,
      grade: parsed.data.grade,
      student_phone: parsed.data.student_phone || null,
      parent_phone: parsed.data.parent_phone || null,
      memo: parsed.data.memo || null,
    })
    .eq('id', id)
  if (error) {
    return { error: '수정 권한이 없거나 입력이 올바르지 않습니다.' }
  }

  revalidatePath(`/classes/${parsed.data.class_id}`)
  return { ok: true }
}

// 학생 삭제 — 원장 또는 담당 강사.
export async function deleteStudent(formData: FormData) {
  const { supabase } = await requireApproved()
  const id = formData.get('id')
  const classId = formData.get('class_id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw new Error(error.message)

  if (typeof classId === 'string' && classId) revalidatePath(`/classes/${classId}`)
}
