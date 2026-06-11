'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { STUDENT_STATUSES, STUDENT_GENDERS } from '@/lib/students'

// ============================================================
// 학생 쓰기 작업은 전부 '원장(admin)' 전용이다.
// 강사는 학생을 생성/수정/삭제하거나 상태·반배정을 바꿀 수 없다(RLS + requireAdmin 이중 차단).
// ============================================================

export type StudentFormState = { error?: string; ok?: boolean } | undefined

// class_id 는 '' (미배정) 또는 uuid
const classIdField = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || /^[0-9a-f-]{36}$/i.test(v), { message: '반이 올바르지 않습니다.' })

// 성별: '' (선택안함) 또는 '남'/'여'
const genderField = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v === null || (STUDENT_GENDERS as readonly string[]).includes(v), {
    message: '성별이 올바르지 않습니다.',
  })

const studentSchema = z.object({
  name: z.string().trim().min(1, { message: '학생 이름을 입력하세요.' }),
  grade: z.string().trim().min(1, { message: '학년을 입력하세요.' }),
  school: z.string().trim().optional(),
  gender: genderField,
  status: z.enum(STUDENT_STATUSES),
  class_id: classIdField,
  student_phone: z.string().trim().optional(),
  parent_phone: z.string().trim().optional(),
  memo: z.string().trim().optional(),
})

function parse(formData: FormData) {
  return studentSchema.safeParse({
    name: formData.get('name'),
    grade: formData.get('grade'),
    school: formData.get('school') ?? undefined,
    gender: formData.get('gender') ?? undefined,
    status: formData.get('status'),
    class_id: formData.get('class_id') ?? undefined,
    student_phone: formData.get('student_phone') ?? undefined,
    parent_phone: formData.get('parent_phone') ?? undefined,
    memo: formData.get('memo') ?? undefined,
  })
}

// 학생 등록 (원장 전용)
export async function addStudent(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
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
    school: parsed.data.school || null,
    gender: parsed.data.gender,
    status: parsed.data.status,
    class_id: parsed.data.class_id,
    student_phone: parsed.data.student_phone || null,
    parent_phone: parsed.data.parent_phone || null,
    memo: parsed.data.memo || null,
  })
  if (error) return { error: '등록에 실패했습니다. 입력을 확인하세요.' }

  revalidatePath('/admin/students')
  return { ok: true }
}

// 학생 수정 (원장 전용) — 상태·반배정 포함 전체 편집
export async function updateStudent(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch (e) {
    return { error: (e as Error).message }
  }

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) return { error: '대상이 올바르지 않습니다.' }

  const parsed = parse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const { error } = await supabase
    .from('students')
    .update({
      name: parsed.data.name,
      grade: parsed.data.grade,
      school: parsed.data.school || null,
      gender: parsed.data.gender,
      status: parsed.data.status,
      class_id: parsed.data.class_id,
      student_phone: parsed.data.student_phone || null,
      parent_phone: parsed.data.parent_phone || null,
      memo: parsed.data.memo || null,
    })
    .eq('id', id)
  if (error) return { error: '수정에 실패했습니다.' }

  revalidatePath('/admin/students')
  return { ok: true }
}

// 학생 삭제 (원장 전용)
export async function deleteStudent(formData: FormData) {
  const { supabase } = await requireAdmin()
  const id = formData.get('id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/students')
}

// 상태만 빠르게 변경 (원장 전용, 인라인 select 용)
export async function setStudentStatus(formData: FormData) {
  const { supabase } = await requireAdmin()
  const id = formData.get('id')
  const status = formData.get('status')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')
  if (typeof status !== 'string' || !STUDENT_STATUSES.includes(status as never)) {
    throw new Error('상태가 올바르지 않습니다.')
  }

  const { error } = await supabase.from('students').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/students')
}

// 선택한 학생들을 특정 반에 일괄 배정/해제 (원장 전용)
// class_id 가 빈 값이면 '미배정'(null)으로 해제한다.
export async function assignStudents(formData: FormData) {
  const { supabase } = await requireAdmin()
  const ids = formData.getAll('ids').filter((v): v is string => typeof v === 'string' && !!v)
  const classRaw = formData.get('class_id')
  const classId = typeof classRaw === 'string' && classRaw ? classRaw : null
  if (ids.length === 0) throw new Error('배정할 학생을 선택하세요.')

  const { error } = await supabase
    .from('students')
    .update({ class_id: classId })
    .in('id', ids)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/students')
}
