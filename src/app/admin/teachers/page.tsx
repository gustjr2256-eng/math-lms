import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { TeacherRowActions } from './_components/TeacherRowActions'

type Status = 'pending' | 'approved' | 'suspended'

type Teacher = {
  id: string
  name: string
  email: string
  status: Status
  created_at: string
}

const SECTIONS: { status: Status; label: string; hint: string }[] = [
  { status: 'pending', label: '승인 대기', hint: '가입 신청 후 승인을 기다리는 강사' },
  { status: 'approved', label: '승인됨', hint: '시스템 이용 가능한 강사' },
  { status: 'suspended', label: '정지됨', hint: '이용이 정지된(퇴사 등) 강사' },
]

// 원장 전용 강사 가입 승인/관리 대시보드.
// proxy가 admin이 아니면 진입을 막지만, 데이터 접근은 RLS(admin 전체)로도 보호된다.
export default async function TeachersAdminPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('users')
    .select('id, name, email, status, created_at')
    .eq('role', 'teacher')
    .order('created_at', { ascending: true })

  const teachers = (data ?? []) as Teacher[]
  const byStatus = (s: Status) => teachers.filter((t) => t.status === s)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
            ← 대시보드
          </Link>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">강사 관리</span>
        </div>
        <LogoutButton />
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          강사 가입 승인 · 관리
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          대기 중인 강사를 승인하거나, 퇴사한 강사를 정지·삭제할 수 있습니다.
        </p>

        <div className="mt-8 flex flex-col gap-8">
          {SECTIONS.map((section) => {
            const rows = byStatus(section.status)
            return (
              <section key={section.status}>
                <div className="mb-3 flex items-baseline gap-2">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {section.label}
                  </h2>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {rows.length}
                  </span>
                  <span className="text-xs text-zinc-400">{section.hint}</span>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                  {rows.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-zinc-400">
                      해당하는 강사가 없습니다.
                    </p>
                  ) : (
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {rows.map((t) => (
                        <li
                          key={t.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                              {t.name}
                            </p>
                            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                              {t.email} · 가입 {formatDate(t.created_at)}
                            </p>
                          </div>
                          <TeacherRowActions userId={t.id} status={t.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
