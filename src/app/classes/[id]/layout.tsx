import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireApproved } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
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
  const { supabase, isAdmin, profile, permissions } = await requireApproved()

  const { data: cls } = await supabase
    .from('classes')
    .select('id, name, subject, day_of_week, time, class_type, teacher:users!classes_teacher_id_fkey(name)')
    .eq('id', id)
    .maybeSingle()

  if (!cls) notFound()

  const rawTeacher = (cls as unknown as { teacher: { name: string } | { name: string }[] | null })
    .teacher
  const teacher = Array.isArray(rawTeacher) ? rawTeacher[0] ?? null : rawTeacher
  const isClinic = (cls as { class_type?: string }).class_type === 'clinic'

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <Link
        href={isClinic ? '/clinic' : '/classes'}
        className="text-sm text-brand/60 hover:underline dark:text-zinc-400"
      >
        ← {isClinic ? '클리닉반 목록' : '반 목록'}
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">{cls.name}</h1>
        {isClinic && (
          <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs font-medium text-brand dark:bg-zinc-800 dark:text-zinc-300">
            클리닉반
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-brand/70 dark:text-zinc-400">
        {cls.subject} · {cls.day_of_week} · {cls.time} · 담당 {teacher?.name ?? '미지정'}
      </p>

      <div className="mt-6">
        <ClassTabs classId={id} isHomeworkEnabled={!isClinic && permissions.homework} />
      </div>

      <div className="mt-8">{children}</div>
    </AppShell>
  )
}
