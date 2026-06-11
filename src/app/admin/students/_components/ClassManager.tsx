'use client'

import { useState, useTransition } from 'react'
import { deleteClass } from '@/app/actions/classes'
import { ClassFormModal, type ClassRow } from './ClassFormModal'

export type ManagedClass = ClassRow & {
  teacherName: string
  studentCount: number
}

// 원장 전용 반 관리 — 목록 + 생성/수정/삭제.
export function ClassManager({
  classes,
  teachers,
}: {
  classes: ManagedClass[]
  teachers: { id: string; name: string }[]
}) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ManagedClass | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
          반 관리 <span className="font-pretendard text-sm text-brand/50">{classes.length}개</span>
        </h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          + 새 반 만들기
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-cream-line bg-cream-card dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-cream-line bg-cream/40 text-xs uppercase text-brand/60 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">반 이름</th>
              <th className="px-4 py-3 font-medium">과목</th>
              <th className="px-4 py-3 font-medium">요일 · 시간</th>
              <th className="px-4 py-3 font-medium">담당 강사</th>
              <th className="px-4 py-3 font-medium">학생</th>
              <th className="px-4 py-3 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-line dark:divide-zinc-800/70">
            {classes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-brand/50 dark:text-zinc-400">
                  아직 생성된 반이 없습니다. ‘+ 새 반 만들기’로 추가하세요.
                </td>
              </tr>
            ) : (
              classes.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-brand dark:text-zinc-50">{c.name}</td>
                  <td className="px-4 py-3 text-brand/70 dark:text-zinc-300">{c.subject}</td>
                  <td className="px-4 py-3 text-brand/70 dark:text-zinc-300">
                    {c.day_of_week} · {c.time}
                  </td>
                  <td className="px-4 py-3 text-brand/70 dark:text-zinc-300">{c.teacherName}</td>
                  <td className="px-4 py-3 text-brand/70 dark:text-zinc-300">{c.studentCount}명</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="rounded-md px-2 py-1 text-xs text-brand/70 hover:bg-brand-tint dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        수정
                      </button>
                      <DeleteClassButton id={c.id} name={c.name} count={c.studentCount} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <ClassFormModal mode="create" teachers={teachers} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <ClassFormModal mode="edit" cls={editing} teachers={teachers} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

function DeleteClassButton({ id, name, count }: { id: string; name: string; count: number }) {
  const [pending, startTransition] = useTransition()
  const onClick = () => {
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
