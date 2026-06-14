import { requireApproved } from '@/lib/auth'
import { deleteProgress } from '@/app/actions/progress'
import { ProgressForm } from '@/components/classes/ProgressForm'

type ProgressRow = {
  id: string
  date: string
  textbook: string
  chapter: string | null
  page_from: number | null
  page_to: number | null
  memo: string | null
}

// 진도 관리 탭: 기록 입력 + 누적 목록.
export default async function ProgressTab({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, permissions } = await requireApproved()

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())

  const { data } = await supabase
    .from('progress')
    .select('id, date, textbook, chapter, page_from, page_to, memo')
    .eq('class_id', id)
    .order('date', { ascending: false })

  const rows = (data ?? []) as ProgressRow[]

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">진도 관리</h2>

      {permissions.progress && <ProgressForm classId={id} today={today} />}

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-medium text-zinc-500">진도 누적 ({rows.length}회)</h3>
        {rows.length === 0 ? (
          <p className="app-card px-4 py-10 text-center text-sm text-zinc-400">
            기록된 진도가 없습니다.
          </p>
        ) : (
          <ul className="overflow-hidden app-card">
            {rows.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-mono text-xs text-zinc-400">{p.date}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{p.textbook}</span>
                    {p.chapter && <span className="text-zinc-500">· {p.chapter}</span>}
                    {(p.page_from != null || p.page_to != null) && (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {p.page_from ?? '?'}–{p.page_to ?? '?'}p
                      </span>
                    )}
                  </div>
                  {p.memo && <p className="mt-1 text-xs text-zinc-400">{p.memo}</p>}
                </div>
                {permissions.progress && (
                  <form action={deleteProgress}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="class_id" value={id} />
                    <button type="submit" className="text-xs text-red-500 hover:underline">
                      삭제
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
