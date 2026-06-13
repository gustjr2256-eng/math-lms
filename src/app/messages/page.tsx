import { redirect } from 'next/navigation'
import { requireApproved } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { AppShell } from '@/components/layout/AppShell'
import { MessageComposer, type ComposerClass, type ComposerStudent } from './_components/MessageComposer'

// 메시지 발송. 원장 + 'messaging' 권한 강사 접근. 강사는 RLS상 담당 반 학생만 조회된다.
export default async function MessagesPage() {
  const { supabase, profile, isAdmin } = await requireApproved()
  if (!hasPermission(profile, 'messaging')) redirect('/dashboard')

  const { data: classes } = await supabase.from('classes').select('id, name').order('name')
  const { data: students } = await supabase
    .from('students_view')
    .select('id, name, grade, class_id, status')
    .order('name')

  const active = ((students ?? []) as ComposerStudent[]).filter((s) => s.status === 'ACTIVE')

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">메시지 발송</h1>
      <p className="mt-2 font-pretendard text-sm text-brand/70 dark:text-zinc-400">
        학생을 선택해 문자(SMS) 또는 알림톡을 보냅니다. 번호는 화면에 노출되지 않으며 발송 시
        서버에서 안전하게 조회됩니다.
      </p>
      <MessageComposer classes={(classes ?? []) as ComposerClass[]} students={active} />
    </AppShell>
  )
}
