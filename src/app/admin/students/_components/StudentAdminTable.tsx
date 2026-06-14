'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  STUDENT_STATUSES,
  STATUS_LABEL,
  STATUS_BADGE,
  type AdminStudent,
  type StudentStatus,
  type School,
} from '@/lib/students'
import { deleteStudent, setStudentStatus, assignStudents } from '@/app/actions/students'
import { StudentFormModal } from './StudentFormModal'
import { SchoolManagerModal } from './SchoolManagerModal'
import { StudentDetailModal } from './StudentDetailModal'

type Cls = { id: string; name: string }
type Filter = 'ALL' | StudentStatus
type GroupBy = 'none' | 'school' | 'grade'

export function StudentAdminTable({
  students,
  classes,
  schools,
}: {
  students: AdminStudent[]
  classes: Cls[]
  schools: School[]
}) {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkClass, setBulkClass] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminStudent | null>(null)
  const [detail, setDetail] = useState<AdminStudent | null>(null)
  const [managingSchools, setManagingSchools] = useState(false)
  const [pending, startTransition] = useTransition()

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: students.length, NEW: 0, ACTIVE: 0, DROPPED: 0 }
    for (const s of students) c[s.status]++
    return c
  }, [students])

  // 필터 드롭다운용 — 실제 학생들이 가진 학교명 목록(학교 선택지 prop과 별개)
  const studentSchools = useMemo(
    () => [...new Set(students.map((s) => s.school).filter((v): v is string => !!v))].sort(),
    [students]
  )
  const grades = useMemo(
    () => [...new Set(students.map((s) => s.grade).filter(Boolean))].sort(),
    [students]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter(
      (s) =>
        (filter === 'ALL' || s.status === filter) &&
        (!schoolFilter || s.school === schoolFilter) &&
        (!gradeFilter || s.grade === gradeFilter) &&
        (!q ||
          s.name.toLowerCase().includes(q) ||
          (s.school ?? '').toLowerCase().includes(q))
    )
  }, [students, filter, schoolFilter, gradeFilter, search])

  // 구분(그룹) 보기 — 학교별 / 학년별
  const groups = useMemo(() => {
    if (groupBy === 'none') return null
    const map = new Map<string, AdminStudent[]>()
    for (const s of filtered) {
      const k = groupBy === 'school' ? s.school || '(학교 미입력)' : s.grade || '(학년 미입력)'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(s)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'))
  }, [filtered, groupBy])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allChecked = (rows: AdminStudent[]) =>
    rows.length > 0 && rows.every((s) => selected.has(s.id))
  const toggleAllRows = (rows: AdminStudent[]) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked(rows)) rows.forEach((s) => next.delete(s.id))
      else rows.forEach((s) => next.add(s.id))
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

  // 공용 테이블 렌더(단일 / 그룹 공통)
  const tableEl = (rows: AdminStudent[]) => (
    <div className="overflow-x-auto app-card">
      <table className="w-full min-w-[1000px] text-left text-[15px]">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-[13px] font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
          <tr>
            <th className="w-10 px-4 py-3.5">
              <input
                type="checkbox"
                checked={allChecked(rows)}
                onChange={() => toggleAllRows(rows)}
              />
            </th>
            <th className="px-4 py-3.5">이름 / 학년·성별</th>
            <th className="px-4 py-3.5">학교</th>
            <th className="px-4 py-3.5">상태</th>
            <th className="px-4 py-3.5">배정 반</th>
            <th className="px-4 py-3.5">학생 연락처</th>
            <th className="px-4 py-3.5">학부모 연락처</th>
            <th className="px-4 py-3.5 text-right">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-400">
                조건에 맞는 학생이 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((s) => (
              <tr key={s.id} className={selected.has(s.id) ? 'bg-zinc-50 dark:bg-zinc-900/40' : ''}>
                <td className="px-4 py-3.5">
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                </td>
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => setDetail(s)}
                    className="text-left text-[15px] font-semibold text-zinc-900 hover:text-brand hover:underline dark:text-zinc-50 dark:hover:text-gold"
                  >
                    {s.name}
                  </button>
                  <div className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">
                    {s.grade}
                    {s.gender ? ` · ${s.gender}` : ''}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-zinc-700 dark:text-zinc-200">{s.school ?? '—'}</td>
                <td className="px-4 py-3.5">
                  <StatusSelect id={s.id} value={s.status} />
                </td>
                <td className="px-4 py-3.5">
                  <ClassSelect id={s.id} value={s.class_id} classes={classes} />
                </td>
                <td className="px-4 py-3.5 text-zinc-700 dark:text-zinc-200">{s.student_phone ?? '—'}</td>
                <td className="px-4 py-3.5 text-zinc-700 dark:text-zinc-200">{s.parent_phone ?? '—'}</td>
                <td className="px-4 py-3.5 text-right">
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
  )

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
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setManagingSchools(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            🏫 학교 관리
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + 학생 등록
          </button>
        </div>
      </div>

      {/* 검색 · 학교/학년 필터 · 구분(그룹) 보기 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름·학교 검색"
          className="h-9 w-48 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={schoolFilter}
          onChange={(e) => setSchoolFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">전체 학교</option>
          {studentSchools.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">전체 학년</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1 text-xs">
          <span className="text-zinc-400">구분</span>
          {(
            [
              ['none', '전체'],
              ['school', '학교별'],
              ['grade', '학년별'],
            ] as [GroupBy, string][]
          ).map(([g, label]) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupBy(g)}
              className={
                'rounded-lg border px-2.5 py-1.5 font-medium transition-colors ' +
                (groupBy === g
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-white dark:text-zinc-900'
                  : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 일괄 반배정 바 */}
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

      {/* 결과: 단일 테이블 또는 학교별/학년별 구분 섹션 */}
      {groupBy === 'none' ? (
        <div className="mt-4">{tableEl(filtered)}</div>
      ) : (
        <div className="mt-4 space-y-6">
          {groups!.length === 0 ? (
            <p className="app-card px-4 py-10 text-center text-sm text-zinc-400">
              조건에 맞는 학생이 없습니다.
            </p>
          ) : (
            groups!.map(([key, rows]) => (
              <section key={key}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  <span>{groupBy === 'school' ? '🏫' : '🎓'}</span>
                  {key}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {rows.length}명
                  </span>
                </h3>
                {tableEl(rows)}
              </section>
            ))
          )}
        </div>
      )}

      {creating && (
        <StudentFormModal
          mode="create"
          classes={classes}
          schools={schools}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <StudentFormModal
          mode="edit"
          student={editing}
          classes={classes}
          schools={schools}
          onClose={() => setEditing(null)}
        />
      )}
      {managingSchools && (
        <SchoolManagerModal schools={schools} onClose={() => setManagingSchools(false)} />
      )}
      {detail && (
        <StudentDetailModal
          studentId={detail.id}
          fallbackName={detail.name}
          onClose={() => setDetail(null)}
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
