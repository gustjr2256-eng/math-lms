import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { AnnouncementManager } from './_components/AnnouncementManager'
import type { Announcement } from '@/lib/announcements'

// 원장 전용 공지 관리. proxy(/admin/*) + requireAdmin 이중 보호.
export default async function AnnouncementsAdminPage() {
  const { supabase, profile } = await requireAdmin()

  const { data } = await supabase
    .from('announcements')
    .select('id, title, body, image_url, active, created_at')
    .order('created_at', { ascending: false })

  const announcements = (data ?? []) as Announcement[]

  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <h1 className="font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">공지 관리</h1>
        <p className="mt-2 font-pretendard text-sm text-brand/70 dark:text-zinc-400">
          공지를 등록하면 강사·원장이 메인 진입 시 팝업으로 보게 됩니다. 활성 공지 중 가장 최근 1건이
          노출되며, 사용자는 헤더 종 버튼으로 다시 볼 수 있습니다.
        </p>

        <AnnouncementManager announcements={announcements} />
      </AdminGuard>
    </AppShell>
  )
}
