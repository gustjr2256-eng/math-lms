import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { MessageComposer, type ComposerClass, type ComposerStudent } from './_components/MessageComposer'

// 원장 전용 타겟팅 메시지 발송. students_view(원장은 실값) 기준.
export default async function MessagesPage() {
  const { supabase, profile } = await requireAdmin()

  const { data: classes } = await supabase.from('classes').select('id, name').order('name')
  const { data: students } = await supabase
    .from('students_view')
    .select('id, name, grade, class_id, status')
    .order('name')

  const active = ((students ?? []) as ComposerStudent[]).filter((s) => s.status === 'ACTIVE')

  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <h1 className="font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">메시지 발송</h1>
        <p className="mt-2 font-pretendard text-sm text-brand/70 dark:text-zinc-400">
          학생을 선택해 문자(SMS) 또는 알림톡을 보냅니다. 번호는 화면에 노출되지 않으며 발송 시
          서버에서 안전하게 조회됩니다.
        </p>
        <MessageComposer classes={(classes ?? []) as ComposerClass[]} students={active} />
      </AdminGuard>
    </AppShell>
  )
}
