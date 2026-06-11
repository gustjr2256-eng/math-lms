import Link from 'next/link'
import { requireApproved } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'

type ClassRow = {
  id: string
  name: string
  subject: string
  day_of_week: string
  time: string
  teacher_id: string
  teacher: { name: string } | { name: string }[] | null
  students: { count: number }[]
}

// PostgREST가 to-one 임베드를 배열로 추론할 수 있어 정규화한다.
function oneTeacher(t: ClassRow['teacher']): { name: string } | null {
  return Array.isArray(t) ? t[0] ?? null : t
}

// 반 목록. 원장은 전체 + 반 생성, 강사는 본인 담당 반만(RLS 자동 필터).
export default async function ClassesPage() {
  const { supabase, isAdmin, profile } = await requireApproved()

  const { data: classData } = await supabase
    .from('classes')
    .select(
      'id, name, subject, day_of_week, time, teacher_id, teacher:users!classes_teacher_id_fkey(name), students!students_class_id_fkey(count)'
    )
    .order('created_at', { ascending: false })

  const classes = (classData ?? []) as unknown as ClassRow[]

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">
        {isAdmin ? '전체 반' : '담당 반'}
      </h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
        {isAdmin
          ? '각 반을 눌러 학생 명단·수업을 관리합니다. 반 생성·담당 강사 지정은 [원장 통합 관리 → 학생 통합 관리]에서 합니다.'
          : '담당하는 반의 학생 명단을 관리할 수 있습니다.'}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {classes.length === 0 ? (
          <p className="col-span-full rounded-xl border border-dashed border-cream-line px-4 py-10 text-center text-sm text-brand/50 dark:border-zinc-700 dark:text-zinc-400">
            {isAdmin ? '아직 생성된 반이 없습니다.' : '담당하는 반이 없습니다.'}
          </p>
        ) : (
          classes.map((c) => (
            <Link
              key={c.id}
              href={`/classes/${c.id}`}
              className="rounded-2xl border border-cream-line bg-cream-card p-5 transition-colors hover:border-brand/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-brand dark:text-zinc-50">{c.name}</h2>
                <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs text-brand dark:bg-zinc-800 dark:text-zinc-300">
                  학생 {c.students?.[0]?.count ?? 0}명
                </span>
              </div>
              <p className="mt-1 text-sm text-brand/70 dark:text-zinc-400">
                {c.subject} · {c.day_of_week} · {c.time}
              </p>
              <p className="mt-3 text-xs text-brand/50 dark:text-zinc-400">
                담당 강사: {oneTeacher(c.teacher)?.name ?? '미지정'}
              </p>
            </Link>
          ))
        )}
      </div>
    </AppShell>
  )
}
