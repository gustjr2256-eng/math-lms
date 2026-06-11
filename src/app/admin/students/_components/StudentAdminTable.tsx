'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  STUDENT_STATUSES,
  STATUS_LABEL,
  STATUS_BADGE,
  type AdminStudent,
  type StudentStatus,
} from '@/lib/students'
import {
  deleteStudent,
  setStudentStatus,
  assignStudents,
} from '@/app/actions/students'
import { StudentFormModal } from './StudentFormModal'

type Cls = { id: string; name: string }
type Filter = 'ALL' | StudentStatus

export function StudentAdminTable({
  students,
  classes,
}: {
  students: AdminStudent[]
  classes: Cls[]
}) {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkClass, setBulkClass] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminStudent | null>(null)
  const [pending, startTransition] = useTransition()

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: students.length, NEW: 0, ACTIVE: 0, DROPPED: 0 }
    for (const s of students) c[s.status]++
    return c
  }, [students])

  const filtered = useMemo(
    () => (filter === 'ALL' ? students : students.filter((s) => s.status === filter)),
    [students, filter]
  )

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allOnPageChecked =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id))
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageChecked) filtered.forEach((s) => next.delete(s.id))
      else filtered.forEach((s) => next.add(s.id))
      return next
    })

  const runBulkAssign = () => {
    if (selected.size === 0) return
    const fd = new FormData()
    selected.forEach((id) => fd.append('ids', id))
    fd.set('class_id', bulkClass)
    startTransition(async () => {
      await assignStudents(fd)
      setSelected(new Set())
    })
  }

  return (
    <div className="mt-8">
      {/* 상태 필터 탭 + 등록 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-1">
          {(['ALL', ...STUDENT_STATUSES] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={
                '-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ' +
                (filter === f
                  ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50'
                  : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300')
              }
            >
              {f === 'ALL' ? '전체' : STATUS_LABEL[f]}
              <span className="ml-1.5 text-xs text-zinc-400">{counts[f]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mb-2 inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + 학생 등록
        </button>
      </div>

      {/* 일괄 반배정 바 (선택 시 노출) */}
      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {selected.size}명 선택됨
          </span>
          <span className="text-sm text-zinc-400">→ 반 배정:</span>
          <select
            value={bulkClass}
            onChange={(e) => setBulkClass(e.target.value)}
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">미배정(해제)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={runBulkAssign}
            disabled={pending}
            className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900"
          >
            {pending ? '배정 중…' : '배정 적용'}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-zinc-400 hover:underline"
          >
            선택 해제
          </button>
        </div>
      )}

      {/* 관리 테이블 */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allOnPageChecked} onChange={toggleAll} />
              </th>
              <th className="px-4 py-3 font-medium">이름 / 학년</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">배정 반</th>
              <th className="px-4 py-3 font-medium">학생 연락처</th>
              <th className="px-4 py-3 font-medium">학부모 연락처</th>
              <th className="px-4 py-3 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-400">
                  해당 상태의 학생이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className={selected.has(s.id) ? 'bg-zinc-50 dark:bg-zinc-900/40' : ''}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{s.name}</div>
                    <div className="text-xs text-zinc-400">{s.grade}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect id={s.id} value={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    <ClassSelect id={s.id} value={s.class_id} classes={classes} />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {s.student_phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {s.parent_phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        수정
                      </button>
                      <DeleteButton id={s.id} name={s.name} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <StudentFormModal mode="create" classes={classes} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <StudentFormModal
          mode="edit"
          student={editing}
          classes={classes}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// 상태 인라인 변경 — 선택 즉시 저장
function StatusSelect({ id, value }: { id: string; value: StudentStatus }) {
  const [pending, startTransition] = useTransition()
  const onChange = (status: string) => {
    const fd = new FormData()
    fd.set('id', id)
    fd.set('status', status)
    startTransition(() => setStudentStatus(fd))
  }
  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      className={
        'h-8 rounded-full border-0 px-2 text-xs font-medium outline-none disabled:opacity-50 ' +
        STATUS_BADGE[value]
      }
    >
      {STUDENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  )
}

// 반 배정 인라인 변경 — 선택 즉시 저장
function ClassSelect({
  id,
  value,
  classes,
}: {
  id: string
  value: string | null
  classes: Cls[]
}) {
  const [pending, startTransition] = useTransition()
  const onChange = (classId: string) => {
    const fd = new FormData()
    fd.append('ids', id)
    fd.set('class_id', classId)
    startTransition(() => assignStudents(fd))
  }
  return (
    <select
      value={value ?? ''}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <option value="">미배정</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition()
  const onClick = () => {
    if (!window.confirm(`${name} 학생을 삭제할까요? 출결·성적 등 관련 기록도 함께 삭제됩니다.`)) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(() => deleteStudent(fd))
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
    >
      {pending ? '삭제 중…' : '삭제'}
    </button>
  )
}
