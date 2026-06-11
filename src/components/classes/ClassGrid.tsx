import Link from 'next/link'

export type GridClass = {
  id: string
  name: string
  subject: string
  day_of_week: string
  time: string
  teacher: { name: string } | { name: string }[] | null
  students: { count: number }[]
}

// PostgREST가 to-one 임베드를 배열로 추론할 수 있어 정규화한다.
function oneTeacher(t: GridClass['teacher']): { name: string } | null {
  return Array.isArray(t) ? t[0] ?? null : t
}

// /classes·/clinic 공용 반 목록 그리드. 각 카드는 공용 상세 /classes/[id] 로 이동.
export function ClassGrid({ classes, emptyText }: { classes: GridClass[]; emptyText: string }) {
  if (classes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-cream-line px-4 py-10 text-center text-sm text-brand/50 dark:border-zinc-700 dark:text-zinc-400">
        {emptyText}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {classes.map((c) => (
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
      ))}
    </div>
  )
}
