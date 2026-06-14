'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, requireApproved } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeHtml, htmlToText } from '@/lib/sanitize-html'
import type { Announcement } from '@/lib/announcements'

export type AnnouncementFormState = { error?: string; ok?: boolean } | undefined

const MAX_BYTES = 5 * 1024 * 1024 // 이미지 5MB

const schema = z.object({
  title: z.string().trim().min(1, { message: '제목을 입력하세요.' }),
  body: z.string().trim().min(1, { message: '본문을 입력하세요.' }),
})

// ── 조회(승인자 전체): 현재 노출할 활성 공지 1건 ───────────────
export async function getActiveAnnouncement(): Promise<Announcement | null> {
  let supabase
  try {
    ;({ supabase } = await requireApproved())
  } catch {
    return null
  }
  const { data } = await supabase
    .from('announcements')
    .select('id, title, body, image_url, active, created_at, target, class_id, body_html')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as Announcement | null) ?? null
}

// ── 조회(승인자 전체): 활성 공지 목록(최신순) ─────────────────
// 대시보드 우측 공지 목록용. 내린(active=false) 공지는 노출하지 않는다.
export async function getActiveAnnouncements(limit = 20): Promise<Announcement[]> {
  let supabase
  try {
    ;({ supabase } = await requireApproved())
  } catch {
    return []
  }
  const { data } = await supabase
    .from('announcements')
    .select('id, title, body, image_url, active, created_at, target, class_id, body_html')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data as Announcement[] | null) ?? []
}

// ── 공지 등록(원장): 제목/본문 + 선택 이미지 ───────────────────
export async function createAnnouncement(
  _prev: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  let supabase
  let userId
  try {
    const ctx = await requireAdmin()
    supabase = ctx.supabase
    userId = ctx.user.id
  } catch (e) {
    return { error: (e as Error).message }
  }

  // 본문은 RichTextEditor 가 보낸 HTML(body_html). body(평문)는 검색/폴백용으로 파생.
  const bodyHtmlRaw = String(formData.get('body_html') ?? '')
  const bodyText = htmlToText(bodyHtmlRaw)

  const parsed = schema.safeParse({
    title: formData.get('title'),
    body: bodyText,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  // 대상: 통합(all) / 특정 반(class)
  const target = String(formData.get('target') ?? 'all') === 'class' ? 'class' : 'all'
  const classId = target === 'class' ? String(formData.get('class_id') ?? '') || null : null
  if (target === 'class' && !classId) return { error: '대상 반을 선택하세요.' }

  const bodyHtml = sanitizeHtml(bodyHtmlRaw)

  // 이미지(선택) 업로드 — 공개 버킷
  let imageUrl: string | null = null
  const file = formData.get('image')
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/')) return { error: '이미지 파일만 첨부할 수 있습니다.' }
    if (file.size > MAX_BYTES) return { error: '이미지가 너무 큽니다 (최대 5MB).' }
    const admin = createAdminClient()
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'png'
    const path = `${globalThis.crypto.randomUUID()}.${ext}`
    const { error: upErr } = await admin.storage
      .from('announcements')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) return { error: '이미지 업로드에 실패했습니다.' }
    imageUrl = admin.storage.from('announcements').getPublicUrl(path).data.publicUrl
  }

  const { error } = await supabase.from('announcements').insert({
    title: parsed.data.title,
    body: parsed.data.body,
    body_html: bodyHtml,
    target,
    class_id: classId,
    image_url: imageUrl,
    created_by: userId,
  })
  if (error) return { error: '공지 등록에 실패했습니다. (0010 마이그레이션 적용 여부를 확인하세요.)' }

  revalidatePath('/admin/announcements')
  return { ok: true }
}

// ── 활성/비활성 토글(원장) ─────────────────────────────────────
export async function setAnnouncementActive(formData: FormData) {
  const { supabase } = await requireAdmin()
  const id = formData.get('id')
  const active = formData.get('active') === 'true'
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  const { error } = await supabase.from('announcements').update({ active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/announcements')
}

// ── 삭제(원장): DB + 이미지 ────────────────────────────────────
export async function deleteAnnouncement(formData: FormData) {
  const { supabase } = await requireAdmin()
  const id = formData.get('id')
  if (typeof id !== 'string' || !id) throw new Error('대상이 올바르지 않습니다.')

  const { data: row, error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
    .select('image_url')
    .maybeSingle()
  if (error) throw new Error(error.message)

  // 공개 버킷 이미지 정리 (URL 끝의 오브젝트 키 추출)
  if (row?.image_url) {
    const key = row.image_url.split('/announcements/').pop()
    if (key) await createAdminClient().storage.from('announcements').remove([key])
  }
  revalidatePath('/admin/announcements')
}
