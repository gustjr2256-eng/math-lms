'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'

// ============================================================
// 학교 목록(schools) 관리 — 원장(admin) 전용.
// 학생 등록 시 학교를 드롭다운에서 고르기 위한 '선택지' 관리.
// 학생 레코드의 school 은 여전히 text(이름)로 저장된다(students.ts 액션 무변경).
// ============================================================

export type SchoolFormState = { error?: string; ok?: boolean } | undefined

const nameSchema = z.string().trim().min(1, { message: '학교 이름을 입력하세요.' })

// 학교 추가 (원장 전용)
export async function addSchool(
  _prev: SchoolFormState,
  formData: FormData
): Promise<SchoolFormState> {
  let supabase, user
  try {
    ;({ supabase, user } = await requireAdmin())
  } catch (e) {
    return { error: (e as Error).message }
  }

  const parsed = nameSchema.safeParse(formData.get('name'))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const { error } = await supabase
    .from('schools')
    .insert({ name: parsed.data, created_by: user.id })
  if (error) {
    // unique 위반(23505) → 중복 안내
    if (error.code === '23505') return { error: '이미 등록된 학교입니다.' }
    return { error: '학교 등록에 실패했습니다.' }
  }

  revalidatePath('/admin/students')
  return { ok: true }
}

// 학교 삭제 (원장 전용)
export async function deleteSchool(formData: FormData) {
  const { supabase } = await requireAdmin()
  const id = formData.get('id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  const { error } = await supabase.from('schools').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/students')
}
