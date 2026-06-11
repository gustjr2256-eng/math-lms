'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import type { MessagingSettingsView } from '@/lib/settings'

export type SettingsFormState = { error?: string; ok?: boolean } | undefined

// ── 조회(원장): secret 은 존재 여부만 ───────────────────────────
export async function getMessagingSettings(): Promise<MessagingSettingsView> {
  const empty: MessagingSettingsView = {
    sender: '',
    apiKeySet: false,
    apiSecretSet: false,
    kakaoPfId: '',
  }
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return empty
  }
  const { data } = await supabase
    .from('academy_settings')
    .select('solapi_api_key, solapi_api_secret, solapi_sender, kakao_pf_id')
    .eq('id', 1)
    .maybeSingle()
  if (!data) return empty
  return {
    sender: data.solapi_sender ?? '',
    apiKeySet: Boolean(data.solapi_api_key),
    apiSecretSet: Boolean(data.solapi_api_secret),
    kakaoPfId: data.kakao_pf_id ?? '',
  }
}

// ── 저장(원장): 빈 key/secret 은 기존 값 유지(마스킹 표시만 두고 미변경) ──
export async function saveMessagingSettings(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  let supabase
  let userId
  try {
    const ctx = await requireAdmin()
    supabase = ctx.supabase
    userId = ctx.user.id
  } catch (e) {
    return { error: (e as Error).message }
  }

  const apiKey = String(formData.get('apiKey') ?? '').trim()
  const apiSecret = String(formData.get('apiSecret') ?? '').trim()
  const sender = String(formData.get('sender') ?? '').trim()
  const kakaoPfId = String(formData.get('kakaoPfId') ?? '').trim()

  const patch: Record<string, unknown> = {
    id: 1,
    solapi_sender: sender,
    kakao_pf_id: kakaoPfId,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }
  // 입력된 경우에만 갱신 → 마스킹된 채 저장 누르면 기존 키 유지
  if (apiKey) patch.solapi_api_key = apiKey
  if (apiSecret) patch.solapi_api_secret = apiSecret

  const { error } = await supabase.from('academy_settings').upsert(patch, { onConflict: 'id' })
  if (error) {
    return { error: '설정 저장에 실패했습니다. (0010 마이그레이션 적용 여부를 확인하세요.)' }
  }

  revalidatePath('/admin/settings')
  return { ok: true }
}
