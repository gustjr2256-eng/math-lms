'use client'

import { useMemo, useState, useTransition } from 'react'
import { saveScores } from '@/app/actions/tests'

type Student = { id: string; name: string; grade: string }

// 엑셀식 점수 입력 그리드. 학생별 점수를 한 화면에서 입력하고 일괄 저장.
export function ScoreGrid({
  testId,
  classId,
  fullScore,
  students,
  initial,
  canEdit = true,
}: {
  testId: string
  classId: string
  fullScore: number
  students: Student[]
  initial: Record<string, string>
  canEdit?: boolean
}) {
  const [scores, setScores] = useState<Record<string, string>>(initial)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const avg = useMemo(() => {
    const vals = Object.values(scores)
      .map((v) => Number(v))
      .filter((n) => v_isFinite(n))
    if (vals.length === 0) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }, [scores])

  const save = () => {
    setMsg(null)
    const payload = Object.entries(scores)
      .filter(([, v]) => v.trim() !== '' && v_isFinite(Number(v)))
      .map(([studentId, v]) => ({ studentId, score: Number(v) }))

    startTransition(async () => {
      const res = await saveScores({ testId, classId, scores: payload })
      setMsg(res.ok ? '저장되었습니다.' : res.error ?? '저장 실패')
    })
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          만점 {fullScore}점 · 평균{' '}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{avg ?? '—'}</span>
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? '저장 중…' : '점수 저장'}
          </button>
        )}
      </div>

      {msg && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          {msg}
        </p>
      )}

      {students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          이 반에 등록된 학생이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {students.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{s.name}</span>
                <span className="ml-2 text-xs text-zinc-400">{s.grade}</span>
              </div>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={fullScore}
                value={scores[s.id] ?? ''}
                onChange={(e) => setScores((m) => ({ ...m, [s.id]: e.target.value }))}
                placeholder="—"
                disabled={!canEdit}
                readOnly={!canEdit}
                className="h-9 w-24 rounded-md border border-zinc-300 bg-white px-2 text-right text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function v_isFinite(n: number) {
  return Number.isFinite(n)
}
