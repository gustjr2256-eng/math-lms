'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireApproved } from '@/lib/auth'

export type TestFormState = { error?: string; ok?: boolean } | undefined

const testSchema = z.object({
  class_id: z.string().uuid(),
  kind: z.enum(['일일', '주간', '기타']),
  title: z.string().trim().min(1, { message: '시험 이름을 입력하세요.' }),
  test_date: z.string().min(1, { message: '날짜를 선택하세요.' }),
  full_score: z.coerce.number().positive({ message: '만점을 올바르게 입력하세요.' }),
})

// 시험 생성 — 원장 또는 담당 강사.
export async function createTest(
  _prev: TestFormState,
  formData: FormData
): Promise<TestFormState> {
  let supabase
  try {
    ;({ supabase } = await requireApproved())
  } catch (e) {
    return { error: (e as Error).message }
  }

  const parsed = testSchema.safeParse({
    class_id: formData.get('class_id'),
    kind: formData.get('kind'),
    title: formData.get('title'),
    test_date: formData.get('test_date'),
    full_score: formData.get('full_score'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const { error } = await supabase.from('tests').insert(parsed.data)
  if (error) return { error: '등록 권한이 없거나 입력이 올바르지 않습니다.' }

  revalidatePath(`/classes/${parsed.data.class_id}/tests`)
  return { ok: true }
}

export async function deleteTest(formData: FormData) {
  const { supabase } = await requireApproved()
  const id = formData.get('id')
  const classId = formData.get('class_id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  const { error } = await supabase.from('tests').delete().eq('id', id)
  if (error) throw new Error(error.message)

  if (typeof classId === 'string' && classId) revalidatePath(`/classes/${classId}/tests`)
}

export type SaveScoresInput = {
  testId: string
  classId: string
  scores: { studentId: string; score: number }[]
}

// 점수 일괄 저장 (엑셀식 입력). 빈 칸은 호출 전에 제외된다.
export async function saveScores(input: SaveScoresInput) {
  const { supabase } = await requireApproved()

  const rows = input.scores.map((s) => ({
    test_id: input.testId,
    student_id: s.studentId,
    score: s.score,
  }))
  if (rows.length === 0) return { ok: true }

  const { error } = await supabase
    .from('test_scores')
    .upsert(rows, { onConflict: 'test_id,student_id' })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/classes/${input.classId}/tests`)
  revalidatePath(`/classes/${input.classId}`)
  return { ok: true }
}
