import { createAdminClient } from '@/lib/supabase/admin'
import { SubmitForm } from '@/components/homework/SubmitForm'

// 제출 페이지 공통 카드 셸.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-[#0a192f]">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {children}
      </div>
    </div>
  )
}

// 비로그인 학생 숙제 제출 페이지.
// proxy 공개경로(/submit). service role 로 토큰을 검증한다(RLS 미사용).
export default async function SubmitPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: hw } = await admin
    .from('homework')
    .select('id, title, description, due_date, class_id, classes:class_id(name)')
    .eq('share_token', token)
    .maybeSingle()

  if (!hw) {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-3xl dark:bg-zinc-800">
            🔍
          </div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            숙제를 찾을 수 없어요
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            링크가 잘못되었거나 만료되었습니다. 선생님께 다시 문의해 주세요.
          </p>
        </div>
      </Shell>
    )
  }

  const cls = (hw as unknown as { classes: { name: string } | { name: string }[] | null }).classes
  const className = Array.isArray(cls) ? cls[0]?.name : cls?.name

  // 재원(ACTIVE) 학생만 이름 선택지에 노출 (퇴원/신규 제외)
  const { data: students } = await admin
    .from('students')
    .select('id, name')
    .eq('class_id', hw.class_id)
    .eq('status', 'ACTIVE')
    .order('name')

  return (
    <Shell>
      <div className="mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {className ?? '숙제'} 제출
        </span>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{hw.title}</h1>
        {hw.description && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{hw.description}</p>
        )}
        <p className="mt-2 text-xs text-zinc-400">마감일: {hw.due_date}</p>
      </div>

      <SubmitForm token={token} students={students ?? []} />
    </Shell>
  )
}
