'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAttendance, type AttStatus } from '@/app/actions/attendance'

type Student = { id: string; name: string; grade: string }

const STATUSES: AttStatus[] = ['출석', '지각', '조퇴', '결석']

const STATUS_STYLE: Record<AttStatus, string> = {
  출석: 'bg-emerald-600 text-white border-emerald-600',
  지각: 'bg-amber-500 text-white border-amber-500',
  조퇴: 'bg-sky-500 text-white border-sky-500',
  결석: 'bg-red-500 text-white border-red-500',
}

// 일별 출결 원클릭 체크 + 일괄 저장.
export function AttendanceBoard({
  classId,
  date,
  students,
  initial,
  canEdit = true,
}: {
  classId: string
  date: string
  students: Student[]
  initial: Record<string, AttStatus>
  canEdit?: boolean
}) {
  const router = useRouter()
  const [marks, setMarks] = useState<Record<string, AttStatus>>(initial)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const setAll = (status: AttStatus) => {
    const next: Record<string, AttStatus> = {}
    students.forEach((s) => (next[s.id] = status))
    setMarks(next)
  }

  const save = () => {
    setMsg(null)
    const records = Object.entries(marks).map(([studentId, status]) => ({ studentId, status }))
    startTransition(async () => {
      const res = await saveAttendance({ classId, date, records })
      setMsg(res.ok ? '저장되었습니다.' : res.error ?? '저장 실패')
    })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">날짜</span>
          <input
            type="date"
            value={date}
            onChange={(e) => router.push(`/classes/${classId}/attendance?date=${e.target.value}`)}
            className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <div className="flex items-center gap-2">
          {!canEdit && <span className="text-xs text-brand/50 dark:text-zinc-400">읽기 전용</span>}
          {canEdit && (
            <button
              type="button"
              onClick={() => setAll('출석')}
              className="h-9 rounded-lg border border-zinc-300 px-3 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              전체 출석
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {pending ? '저장 중…' : '저장'}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          {msg}
        </p>
      )}

      {students.length === 0 ? (
        <p className="app-card px-4 py-10 text-center text-sm text-zinc-400">
          이 반에 등록된 학생이 없습니다. 먼저 학생을 등록하세요.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden app-card dark:divide-zinc-800">
          {students.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{s.name}</span>
                <span className="ml-2 text-xs text-zinc-400">{s.grade}</span>
              </div>
              <div className="flex gap-1.5">
                {STATUSES.map((st) => {
                  const active = marks[s.id] === st
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={!canEdit}
                      onClick={canEdit ? () => setMarks((m) => ({ ...m, [s.id]: st })) : undefined}
                      className={
                        'h-8 w-12 rounded-md border text-xs font-medium transition-colors ' +
                        (active
                          ? STATUS_STYLE[st]
                          : 'border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800')
                      }
                    >
                      {st}
                    </button>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
