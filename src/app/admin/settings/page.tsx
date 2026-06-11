import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { getMessagingSettings } from '@/app/actions/settings'
import { SettingsForm } from './_components/SettingsForm'

// 원장 전용 외부 서비스 연동 설정. proxy(/admin/*) + requireAdmin + AdminGuard 삼중 보호.
export default async function SettingsPage() {
  const { profile } = await requireAdmin()
  const settings = await getMessagingSettings()

  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <div className="mx-auto max-w-2xl">
          <h1 className="font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">학원 설정</h1>
          <p className="mt-2 font-pretendard text-sm text-brand/70 dark:text-zinc-400">
            외부 서비스(문자·알림톡) 연동 키를 관리합니다. 여기에 입력한 키로 메시지 발송이 동작합니다.
          </p>
          <SettingsForm initial={settings} />
        </div>
      </AdminGuard>
    </AppShell>
  )
}
