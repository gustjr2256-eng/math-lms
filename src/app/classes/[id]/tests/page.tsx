import Link from 'next/link'
import { requireApproved } from '@/lib/auth'
import { deleteTest } from '@/app/actions/tests'
import { TestCreateForm } from '@/components/classes/TestCreateForm'
import { ScoreGrid } from '@/components/classes/ScoreGrid'

type TestRow = {
  id: string
  kind: string
  title: string
  test_date: string
  full_score: number
}

// 성적(테스트) 탭: 시험 생성 + 목록 + 선택 시험의 점수 그리드.
export default async function TestsTab({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ test?: string }>
}) {
  const { id } = await params
  const { test: selectedId } = await searchParams
  const { supabase, permissions } = await requireApproved()

  const { data: testData } = await supabase
    .from('tests')
    .select('id, kind, title, test_date, full_score')
    .eq('class_id', id)
    .order('test_date', { ascending: false })

  const tests = (testData ?? []) as TestRow[]
  const selected = tests.find((t) => t.id === selectedId) ?? null

  let students: { id: string; name: string; grade: string }[] = []
  const initial: Record<string, string> = {}
  if (selected) {
    const [studentsRes, scoresRes] = await Promise.all([
      supabase.from('students_view').select('id, name, grade').eq('class_id', id).order('name'),
      supabase.from('test_scores').select('student_id, score').eq('test_id', selected.id),
    ])
    students = (studentsRes.data ?? []) as { id: string; name: string; grade: string }[]
    for (const r of (scoresRes.data ?? []) as { student_id: string; score: number }[]) {
      initial[r.student_id] = String(r.score)
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">테스트 및 성적</h2>

      {permissions.scores && <TestCreateForm classId={id} />}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 시험 목록 */}
        <div className="lg:col-span-1">
          <h3 className="mb-2 text-sm font-medium text-zinc-500">시험 목록</h3>
          {tests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
              등록된 시험이 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tests.map((t) => {
                const active = t.id === selectedId
                return (
                  <li key={t.id}>
                    <div
                      className={
                        'flex items-center justify-between rounded-xl border px-3 py-2.5 ' +
                        (active
                          ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900'
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950')
                      }
                    >
                      <Link href={`/classes/${id}/tests?test=${t.id}`} className="min-w-0 flex-1">
                        <span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {t.kind}
                        </span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {t.title}
                        </span>
                        <span className="ml-1 block text-xs text-zinc-400">
                          {t.test_date} · {t.full_score}점
                        </span>
                      </Link>
                      <form action={deleteTest}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="class_id" value={id} />
                        <button
                          type="submit"
                          className="ml-2 text-xs text-red-500 hover:underline"
                          title="시험 삭제"
                        >
                          삭제
                        </button>
                      </form>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* 점수 입력 그리드 */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {selected.title}{' '}
                <span className="text-sm font-normal text-zinc-400">점수 입력</span>
              </h3>
              <ScoreGrid
                testId={selected.id}
                classId={id}
                fullScore={Number(selected.full_score)}
                students={students}
                initial={initial}
                canEdit={permissions.scores}
              />
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-16 text-center text-sm text-zinc-400 dark:border-zinc-700">
              왼쪽에서 시험을 선택하면 학생별 점수를 입력할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
