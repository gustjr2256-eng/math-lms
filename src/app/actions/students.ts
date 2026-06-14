'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { STUDENT_STATUSES, STUDENT_GENDERS, type StudentStatus } from '@/lib/students'
import { formatProgress } from '@/lib/dashboard'
import type { AttStatus } from '@/app/actions/attendance'

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

// ── 학생 상세(원장): 반/스케줄/담당강사 + 최근 출결 ───────────
export type StudentAttendanceRow = {
  date: string
  status: AttStatus
  progress: string | null
}
export type StudentDetail = {
  id: string
  name: string
  grade: string
  school: string | null
  status: StudentStatus
  parent_phone: string | null
  student_phone: string | null
  cls: { name: string; subject: string; schedule: string; teacher: string } | null
  attendance: StudentAttendanceRow[]
}

export async function getStudentDetail(studentId: string): Promise<StudentDetail | null> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return null
  }

  // 원장은 students 전체 접근(실번호) — 뷰 아닌 원본 테이블
  const { data: s } = await supabase
    .from('students')
    .select('id, name, grade, school, status, class_id, parent_phone, student_phone')
    .eq('id', studentId)
    .maybeSingle()
  if (!s) return null

  let cls: StudentDetail['cls'] = null
  let attendance: StudentAttendanceRow[] = []

  if (s.class_id) {
    const { data: c } = await supabase
      .from('classes')
      .select('name, subject, day_of_week, time, teacher:users!classes_teacher_id_fkey(name)')
      .eq('id', s.class_id)
      .maybeSingle()
    if (c) {
      const t = Array.isArray(c.teacher) ? c.teacher[0] : c.teacher
      cls = {
        name: c.name,
        subject: c.subject,
        schedule: `${c.day_of_week} ${c.time}`,
        teacher: (t as { name: string } | null)?.name ?? '미지정',
      }
    }

    const [attRes, progRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('date, status')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(10),
      supabase
        .from('progress')
        .select('date, textbook, chapter, page_from, page_to')
        .eq('class_id', s.class_id),
    ])

    const progByDate = new Map<string, string>()
    for (const p of progRes.data ?? []) progByDate.set(p.date, formatProgress(p))

    attendance = (attRes.data ?? []).map((a) => ({
      date: a.date,
      status: a.status as AttStatus,
      progress: progByDate.get(a.date) ?? null,
    }))
  }

  return {
    id: s.id,
    name: s.name,
    grade: s.grade,
    school: s.school,
    status: s.status as StudentStatus,
    parent_phone: s.parent_phone,
    student_phone: s.student_phone,
    cls,
    attendance,
  }
}

// 연락처만 빠르게 수정 (원장 전용, 상세 모달의 인라인 편집용)
export async function updateStudentContacts(
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

  const parent = String(formData.get('parent_phone') ?? '').trim() || null
  const student = String(formData.get('student_phone') ?? '').trim() || null

  const { error } = await supabase
    .from('students')
    .update({ parent_phone: parent, student_phone: student })
    .eq('id', id)
  if (error) return { error: '연락처 수정에 실패했습니다.' }

  revalidatePath('/admin/students')
  return { ok: true }
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
