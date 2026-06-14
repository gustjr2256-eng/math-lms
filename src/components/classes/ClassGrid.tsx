'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { buildTeacherColors, colorForTeacher } from '@/lib/timetable'

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

const UNASSIGNED = '미지정'

function teacherOf(c: GridClass): string {
  return oneTeacher(c.teacher)?.name ?? UNASSIGNED
}

// /classes·/clinic 공용 반 목록 그리드.
// 담당 강사마다 고유 색상(timetable 팔레트 재사용) + 상단 강사별 조회 필터 + 호버 카드.
export function ClassGrid({ classes, emptyText }: { classes: GridClass[]; emptyText: string }) {
  const teacherColors = useMemo(
    () => buildTeacherColors(classes.map(teacherOf)),
    [classes]
  )

  // 담당 강사 목록(중복 제거, 이름순). buildTeacherColors와 동일 정렬이라 색이 안정적.
  const teachers = useMemo(
    () => [...new Set(classes.map(teacherOf))].sort(),
    [classes]
  )

  const [selected, setSelected] = useState<string | null>(null)

  const visible = selected ? classes.filter((c) => teacherOf(c) === selected) : classes

  if (classes.length === 0) {
    return (
      <p className="app-card px-4 py-10 text-center text-sm text-brand/50 dark:text-zinc-400">
        {emptyText}
      </p>
    )
  }

  return (
    <div>
      {/* 담당 선생님별 조회 필터 */}
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip
          active={selected === null}
          onClick={() => setSelected(null)}
        >
          전체 {classes.length}
        </FilterChip>
        {teachers.map((name) => {
          const count = classes.filter((c) => teacherOf(c) === name).length
          const active = selected === name
          return (
            <FilterChip
              key={name}
              active={active}
              onClick={() => setSelected(active ? null : name)}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full border ${colorForTeacher(teacherColors, name)}`}
                aria-hidden
              />
              {name} {count}
            </FilterChip>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map((c) => {
          const teacherName = teacherOf(c)
          const color = colorForTeacher(teacherColors, teacherName)
          return (
            <Link
              key={c.id}
              href={`/classes/${c.id}`}
              className="group block overflow-hidden rounded-2xl border border-cream-line bg-cream-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:shadow-lg focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
            >
              {/* 담당 강사 색상 띠 */}
              <div className={`h-2 w-full ${color}`} aria-hidden />

              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-brand dark:text-zinc-50">{c.name}</h2>
                  <span className="shrink-0 rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-white dark:bg-gold dark:text-[#0a192f]">
                    학생 {c.students?.[0]?.count ?? 0}명
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-brand/80 dark:text-zinc-200">
                  <span className="inline-flex items-center gap-1.5">
                    <BookIcon />
                    {c.subject}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon />
                    {c.day_of_week} · {c.time}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${color}`}
                  >
                    <UserIcon />
                    {teacherName}
                  </span>
                  <span className="text-xs font-semibold text-brand/50 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-300">
                    관리하기 →
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-brand bg-brand text-white dark:border-gold dark:bg-gold dark:text-[#0a192f]'
          : 'border-cream-line bg-cream-card text-brand hover:border-brand/40 hover:bg-brand-tint dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600'
      }`}
    >
      {children}
    </button>
  )
}

function BookIcon() {
  return (
    <svg className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
