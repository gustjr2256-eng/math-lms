import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireApproved } from '@/lib/auth'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { ClassTabs } from '@/components/classes/ClassTabs'

// 반 대시보드 공통 레이아웃: 반 헤더 + 탭. 접근 권한은 RLS가 판정.
export default async function ClassLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>
  children: React.ReactNode
}) {
  const { id } = await params
  const { supabase } = await requireApproved()

  const { data: cls } = await supabase
    .from('classes')
    .select('id, name, subject, day_of_week, time, teacher:users!classes_teacher_id_fkey(name)')
    .eq('id', id)
    .maybeSingle()

  if (!cls) notFound()

  const rawTeacher = (cls as unknown as { teacher: { name: string } | { name: string }[] | null })
    .teacher
  const teacher = Array.isArray(rawTeacher) ? rawTeacher[0] ?? null : rawTeacher

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <Link href="/classes" className="text-sm text-zinc-500 hover:underline">
          ← 반 목록
        </Link>
        <LogoutButton />
      </header>

      <div className="mx-auto max-w-5xl px-6 pt-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{cls.name}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {cls.subject} · {cls.day_of_week} · {cls.time} · 담당 {teacher?.name ?? '미지정'}
        </p>

        <div className="mt-6">
          <ClassTabs classId={id} />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
