import Link from 'next/link'
import { requireApproved } from '@/lib/auth'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { ClassCreateForm } from '@/components/classes/ClassCreateForm'

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
  const { supabase, isAdmin } = await requireApproved()

  const { data: classData } = await supabase
    .from('classes')
    .select(
      'id, name, subject, day_of_week, time, teacher_id, teacher:users!classes_teacher_id_fkey(name), students(count)'
    )
    .order('created_at', { ascending: true })

  const classes = (classData ?? []) as unknown as ClassRow[]

  // 원장만: 반 생성 드롭다운용 승인 강사 목록
  let teachers: { id: string; name: string }[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'teacher')
      .eq('status', 'approved')
      .order('name')
    teachers = data ?? []
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
            ← 대시보드
          </Link>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">반 관리</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {isAdmin ? '원장' : '강사'}
          </span>
        </div>
        <LogoutButton />
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {isAdmin ? '전체 반' : '담당 반'}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {isAdmin
            ? '반을 생성하고 담당 강사를 지정하세요. 각 반을 눌러 학생 명단을 관리합니다.'
            : '담당하는 반의 학생 명단을 관리할 수 있습니다.'}
        </p>

        {isAdmin && (
          <div className="mt-6">
            <ClassCreateForm teachers={teachers} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {classes.length === 0 ? (
            <p className="col-span-full rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
              {isAdmin ? '아직 생성된 반이 없습니다.' : '담당하는 반이 없습니다.'}
            </p>
          ) : (
            classes.map((c) => (
              <Link
                key={c.id}
                href={`/classes/${c.id}`}
                className="rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{c.name}</h2>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    학생 {c.students?.[0]?.count ?? 0}명
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {c.subject} · {c.day_of_week} · {c.time}
                </p>
                <p className="mt-3 text-xs text-zinc-400">
                  담당 강사: {oneTeacher(c.teacher)?.name ?? '미지정'}
                </p>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
