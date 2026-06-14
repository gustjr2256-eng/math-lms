'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { deleteClass } from '@/app/actions/classes'
import { getStudentsByClass, type ClassStudentRow } from '@/app/actions/students'
import { STATUS_LABEL, STATUS_BADGE } from '@/lib/students'
import { ClassFormModal, type ClassRow } from './ClassFormModal'
import { StudentDetailModal } from './StudentDetailModal'

export type ManagedClass = ClassRow & {
  teacherName: string
  studentCount: number
}

// 원장 전용 반 관리 — 목록 + 생성/수정/삭제 + 행 클릭 시 소속 학생 아코디언.
export function ClassManager({
  classes,
  teachers,
  classType = 'regular',
}: {
  classes: ManagedClass[]
  teachers: { id: string; name: string }[]
  classType?: 'regular' | 'clinic'
}) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ManagedClass | null>(null)
  const typeLabel = classType === 'clinic' ? '클리닉반' : '정규반'

  // 강사별 필터(null = 전체) + 강사별 담당 반 개수
  const [teacherFilter, setTeacherFilter] = useState<string | null>(null)
  const countByTeacher = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of classes) m[c.teacher_id] = (m[c.teacher_id] ?? 0) + 1
    return m
  }, [classes])
  const visibleClasses = teacherFilter
    ? classes.filter((c) => c.teacher_id === teacherFilter)
    : classes

  // 아코디언(펼친 반) + 학생 캐시 + 상세 모달 대상
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [studentsByClass, setStudentsByClass] = useState<Record<string, ClassStudentRow[]>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ id: string; name: string } | null>(null)

  const toggle = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!studentsByClass[id]) {
      setLoadingId(id)
      const rows = await getStudentsByClass(id)
      setStudentsByClass((prev) => ({ ...prev, [id]: rows }))
      setLoadingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
          {typeLabel} 관리 <span className="font-pretendard text-sm text-brand/50">{classes.length}개</span>
        </h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong dark:bg-gold dark:text-[#0a192f] dark:hover:bg-gold-strong"
        >
          + 새 {typeLabel} 만들기
        </button>
      </div>

      {/* 강사별 필터 — 강사를 고르면 담당 반만 보여준다 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-pretendard text-xs font-medium text-brand/50 dark:text-zinc-500">
          강사별 보기
        </span>
        <TeacherChip
          active={teacherFilter === null}
          onClick={() => setTeacherFilter(null)}
          label="전체"
          count={classes.length}
        />
        {teachers.map((t) => (
          <TeacherChip
            key={t.id}
            active={teacherFilter === t.id}
            onClick={() => setTeacherFilter(t.id)}
            label={t.name}
            count={countByTeacher[t.id] ?? 0}
          />
        ))}
      </div>

      <div className="mt-3 overflow-x-auto app-card">
        <table className="w-full min-w-[760px] text-left text-[15px]">
          <thead className="border-b border-cream-line bg-cream/40 text-[13px] font-semibold text-brand/70 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
            <tr>
              <th className="px-4 py-3.5">반 이름</th>
              <th className="px-4 py-3.5">과목</th>
              <th className="px-4 py-3.5">요일 · 시간</th>
              <th className="px-4 py-3.5">담당 강사</th>
              <th className="px-4 py-3.5">학생</th>
              <th className="px-4 py-3.5 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-line dark:divide-zinc-800/70">
            {visibleClasses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-brand/50 dark:text-zinc-400">
                  {classes.length === 0
                    ? '아직 생성된 반이 없습니다. ‘+ 새 반 만들기’로 추가하세요.'
                    : '이 강사가 담당하는 반이 없습니다.'}
                </td>
              </tr>
            ) : (
              visibleClasses.map((c) => {
                const open = expandedId === c.id
                const students = studentsByClass[c.id] ?? []
                return (
                  <Fragment key={c.id}>
                    <tr
                      onClick={() => toggle(c.id)}
                      className={
                        'cursor-pointer transition-colors hover:bg-brand-tint/60 dark:hover:bg-zinc-800/60 ' +
                        (open ? 'bg-brand-tint/50 dark:bg-zinc-800/50' : '')
                      }
                    >
                      <td className="px-4 py-3.5 text-[15px] font-semibold text-brand dark:text-zinc-50">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={
                              'text-xs text-brand/40 transition-transform dark:text-zinc-500 ' +
                              (open ? 'rotate-90' : '')
                            }
                          >
                            ▶
                          </span>
                          {c.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-brand/85 dark:text-zinc-200">{c.subject}</td>
                      <td className="px-4 py-3.5 text-brand/85 dark:text-zinc-200">
                        {c.day_of_week} · {c.time}
                      </td>
                      <td className="px-4 py-3.5 text-brand/85 dark:text-zinc-200">{c.teacherName}</td>
                      <td className="px-4 py-3.5 text-brand/85 dark:text-zinc-200">{c.studentCount}명</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditing(c)
                            }}
                            className="rounded-md px-2 py-1 text-xs text-brand/70 hover:bg-brand-tint dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            수정
                          </button>
                          <DeleteClassButton id={c.id} name={c.name} count={c.studentCount} />
                        </div>
                      </td>
                    </tr>

                    {/* 펼침 행: 소속 학생 명단 */}
                    {open && (
                      <tr className="bg-cream/40 dark:bg-zinc-900/40">
                        <td colSpan={6} className="px-4 py-4">
                          {loadingId === c.id ? (
                            <p className="font-pretendard text-sm text-brand/50 dark:text-zinc-400">
                              학생 명단 불러오는 중…
                            </p>
                          ) : students.length === 0 ? (
                            <p className="font-pretendard text-sm text-brand/40 dark:text-zinc-500">
                              이 반에 등록된 학생이 없습니다.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {students.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDetail({ id: s.id, name: s.name })
                                  }}
                                  className="inline-flex items-center gap-2 rounded-full border border-cream-line bg-cream-card px-3 py-1.5 font-pretendard text-sm text-brand/85 transition-colors hover:border-brand/40 hover:bg-brand-tint dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-gold/40 dark:hover:bg-zinc-800"
                                >
                                  <span
                                    className={
                                      'h-2 w-2 rounded-full ' +
                                      STATUS_BADGE[s.status].split(' ')[0]
                                    }
                                    title={STATUS_LABEL[s.status]}
                                  />
                                  <span className="font-semibold">{s.name}</span>
                                  <span className="text-xs text-brand/45 dark:text-zinc-500">{s.grade}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <ClassFormModal mode="create" teachers={teachers} classType={classType} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <ClassFormModal mode="edit" cls={editing} teachers={teachers} classType={classType} onClose={() => setEditing(null)} />
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

function TeacherChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-pretendard text-sm transition-colors ' +
        (active
          ? 'border-brand bg-brand text-white dark:border-gold dark:bg-gold dark:text-[#0a192f]'
          : 'border-cream-line bg-cream-card text-brand/75 hover:border-brand/40 hover:bg-brand-tint dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-gold/40 dark:hover:bg-zinc-800')
      }
    >
      <span className="font-semibold">{label}</span>
      <span
        className={
          'rounded-full px-1.5 text-xs tabular-nums ' +
          (active
            ? 'bg-white/20 text-white dark:bg-[#0a192f]/20 dark:text-[#0a192f]'
            : 'bg-brand/10 text-brand/60 dark:bg-zinc-800 dark:text-zinc-400')
        }
      >
        {count}
      </span>
    </button>
  )
}

function DeleteClassButton({ id, name, count }: { id: string; name: string; count: number }) {
  const [pending, startTransition] = useTransition()
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const warn =
      count > 0
        ? `${name} 반을 삭제할까요? 소속 학생 ${count}명은 '미배정' 상태가 됩니다(학생 데이터는 유지).`
        : `${name} 반을 삭제할까요?`
    if (!window.confirm(warn)) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(() => deleteClass(fd))
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
