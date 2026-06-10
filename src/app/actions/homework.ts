'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireApproved } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export type HomeworkFormState = { error?: string; ok?: boolean } | undefined

const homeworkSchema = z.object({
  class_id: z.string().uuid(),
  title: z.string().trim().min(1, { message: '과제명을 입력하세요.' }),
  due_date: z.string().min(1, { message: '마감일을 선택하세요.' }),
  description: z.string().trim().optional(),
})

// ── 강사 시점 ───────────────────────────────────────────────

// 숙제 생성 (share_token 은 DB default 로 자동 생성)
export async function createHomework(
  _prev: HomeworkFormState,
  formData: FormData
): Promise<HomeworkFormState> {
  let supabase
  try {
    ;({ supabase } = await requireApproved())
  } catch (e) {
    return { error: (e as Error).message }
  }

  const parsed = homeworkSchema.safeParse({
    class_id: formData.get('class_id'),
    title: formData.get('title'),
    due_date: formData.get('due_date'),
    description: formData.get('description') ?? undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const { error } = await supabase.from('homework').insert({
    class_id: parsed.data.class_id,
    title: parsed.data.title,
    due_date: parsed.data.due_date,
    description: parsed.data.description || null,
  })
  if (error) return { error: '등록 권한이 없거나 입력이 올바르지 않습니다.' }

  revalidatePath(`/classes/${parsed.data.class_id}/homework`)
  return { ok: true }
}

export async function deleteHomework(formData: FormData) {
  const { supabase } = await requireApproved()
  const id = formData.get('id')
  const classId = formData.get('class_id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  const { error } = await supabase.from('homework').delete().eq('id', id)
  if (error) throw new Error(error.message)

  if (typeof classId === 'string' && classId) revalidatePath(`/classes/${classId}/homework`)
}

// 제출물 채점 (완료/미흡)
export async function reviewSubmission(formData: FormData) {
  const { supabase } = await requireApproved()
  const id = formData.get('id')
  const review = formData.get('review')
  const classId = formData.get('class_id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')
  if (review !== '완료' && review !== '미흡') throw new Error('상태가 올바르지 않습니다.')

  const { error } = await supabase
    .from('homework_submissions')
    .update({ review, reviewed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  if (typeof classId === 'string' && classId) revalidatePath(`/classes/${classId}/homework`)
}

// ── 학생 시점 (비로그인) ────────────────────────────────────

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

// 숙제 제출: 토큰 검증 → Storage 업로드 → DB 기록. 모두 service role.
export async function submitHomework(
  _prev: HomeworkFormState,
  formData: FormData
): Promise<HomeworkFormState> {
  const token = formData.get('token')
  const studentName = formData.get('student_name')
  const studentIdRaw = formData.get('student_id')
  const file = formData.get('file')

  if (typeof token !== 'string' || !token) return { error: '잘못된 접근입니다.' }
  if (typeof studentName !== 'string' || studentName.trim() === '') {
    return { error: '이름을 선택하거나 입력하세요.' }
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: '제출할 사진을 첨부하세요.' }
  }
  if (!file.type.startsWith('image/')) {
    return { error: '이미지 파일만 업로드할 수 있습니다.' }
  }
  if (file.size > MAX_BYTES) {
    return { error: '파일이 너무 큽니다 (최대 10MB).' }
  }

  const admin = createAdminClient()

  const { data: hw } = await admin
    .from('homework')
    .select('id, class_id')
    .eq('share_token', token)
    .maybeSingle()
  if (!hw) return { error: '존재하지 않거나 만료된 숙제입니다.' }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${hw.id}/${globalThis.crypto.randomUUID()}.${ext}`

  const { error: upErr } = await admin.storage
    .from('homework')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) return { error: '업로드에 실패했습니다. 다시 시도해 주세요.' }

  const { data: pub } = admin.storage.from('homework').getPublicUrl(path)

  const studentId =
    typeof studentIdRaw === 'string' && studentIdRaw ? studentIdRaw : null

  const { error: insErr } = await admin.from('homework_submissions').insert({
    homework_id: hw.id,
    student_id: studentId,
    student_name: studentName.trim(),
    image_url: pub.publicUrl,
  })
  if (insErr) return { error: '제출 기록에 실패했습니다.' }

  return { ok: true }
}
