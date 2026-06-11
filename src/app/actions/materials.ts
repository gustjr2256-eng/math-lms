'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireApproved } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { GRADES_BY_LEVEL, SCHOOL_LEVELS, CATEGORIES } from '@/lib/materials'

export type MaterialFormState = { error?: string; ok?: boolean } | undefined

// 업로드 허용 확장자(문제지·교재·압축). 기밀 내부 자료라 이미지 제한은 두지 않는다.
const MAX_BYTES = 50 * 1024 * 1024 // 50MB

const metaSchema = z
  .object({
    title: z.string().trim().min(1, { message: '제목을 입력하세요.' }),
    description: z.string().trim().optional(),
    school_level: z.enum(SCHOOL_LEVELS),
    grade: z.string(),
    category: z.enum(CATEGORIES),
  })
  .refine((d) => (GRADES_BY_LEVEL[d.school_level] as readonly string[]).includes(d.grade), {
    message: '학년이 대분류와 맞지 않습니다.',
    path: ['grade'],
  })

// ── 자료 등록 (업로드) ──────────────────────────────────────
// 파일은 service role 로 비공개 버킷에 올리고, DB 행은 본인 인증 클라이언트로
// insert 하여 RLS(created_by = auth.uid())가 강제되게 한다.
export async function createMaterial(
  _prev: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  let supabase
  let userId
  try {
    const ctx = await requireApproved()
    supabase = ctx.supabase
    userId = ctx.user.id
  } catch (e) {
    return { error: (e as Error).message }
  }

  const parsed = metaSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') ?? undefined,
    school_level: formData.get('school_level'),
    grade: formData.get('grade'),
    category: formData.get('category'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: '첨부할 파일을 선택하세요.' }
  }
  if (file.size > MAX_BYTES) {
    return { error: '파일이 너무 큽니다 (최대 50MB).' }
  }

  const admin = createAdminClient()
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin'
  const path = `${parsed.data.school_level}/${parsed.data.grade}/${globalThis.crypto.randomUUID()}.${ext}`

  const { error: upErr } = await admin.storage
    .from('materials')
    .upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (upErr) return { error: '업로드에 실패했습니다. 다시 시도해 주세요.' }

  const { error: insErr } = await supabase.from('materials').insert({
    title: parsed.data.title,
    description: parsed.data.description || null,
    school_level: parsed.data.school_level,
    grade: parsed.data.grade,
    category: parsed.data.category,
    file_path: path,
    file_name: file.name,
    file_size: file.size,
    created_by: userId,
  })
  if (insErr) {
    // DB 실패 시 올린 파일을 되돌려 고아 파일을 남기지 않는다.
    await admin.storage.from('materials').remove([path])
    return { error: '자료 등록에 실패했습니다.' }
  }

  revalidatePath('/materials')
  return { ok: true }
}

// ── 자료 수정 (메타 정보만) ─────────────────────────────────
export async function updateMaterial(
  _prev: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  let supabase
  try {
    ;({ supabase } = await requireApproved())
  } catch (e) {
    return { error: (e as Error).message }
  }

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) return { error: '대상이 올바르지 않습니다.' }

  const parsed = metaSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') ?? undefined,
    school_level: formData.get('school_level'),
    grade: formData.get('grade'),
    category: formData.get('category'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  // RLS가 작성자/원장만 통과시킨다.
  const { error } = await supabase
    .from('materials')
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      school_level: parsed.data.school_level,
      grade: parsed.data.grade,
      category: parsed.data.category,
    })
    .eq('id', id)
  if (error) return { error: '수정 권한이 없거나 입력이 올바르지 않습니다.' }

  revalidatePath('/materials')
  return { ok: true }
}

// ── 자료 삭제 (DB 행 + 스토리지 파일) ───────────────────────
export async function deleteMaterial(formData: FormData) {
  const { supabase } = await requireApproved()
  const id = formData.get('id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  // 먼저 RLS 통과(작성자/원장) 하에 행을 삭제하고 경로를 회수.
  const { data: row, error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id)
    .select('file_path')
    .maybeSingle()
  if (error) throw new Error('삭제 권한이 없습니다.')

  if (row?.file_path) {
    await createAdminClient().storage.from('materials').remove([row.file_path])
  }

  revalidatePath('/materials')
}

// ── 다운로드용 단기 서명 URL 발급 ───────────────────────────
// 비공개 버킷이라 영구 URL이 없다. 승인 사용자 확인 후 60초짜리 서명 URL 반환.
export async function getMaterialDownloadUrl(
  id: string
): Promise<{ url?: string; error?: string }> {
  let supabase
  try {
    ;({ supabase } = await requireApproved())
  } catch (e) {
    return { error: (e as Error).message }
  }

  // 승인 사용자는 RLS상 모든 자료 조회 가능.
  const { data: mat } = await supabase
    .from('materials')
    .select('file_path, file_name')
    .eq('id', id)
    .maybeSingle()
  if (!mat) return { error: '존재하지 않는 자료입니다.' }

  const { data, error } = await createAdminClient()
    .storage.from('materials')
    .createSignedUrl(mat.file_path, 60, { download: mat.file_name })
  if (error || !data) return { error: '다운로드 링크 생성에 실패했습니다.' }

  return { url: data.signedUrl }
}
