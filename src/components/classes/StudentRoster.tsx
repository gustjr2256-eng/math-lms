'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import {
  addStudent,
  updateStudent,
  deleteStudent,
  type StudentFormState,
} from '@/app/actions/students'

export type Student = {
  id: string
  name: string
  grade: string
  student_phone: string | null
  parent_phone: string | null
  memo: string | null
}

const inputCls =
  'h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'

// 반별 학생 명단 관리. canEditPhone=false(강사)면 전화번호는 마스킹 표시 + 편집 불가.
export function StudentRoster({
  classId,
  students,
  canEditPhone,
}: {
  classId: string
  students: Student[]
  canEditPhone: boolean
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const colCount = canEditPhone ? 6 : 5

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800">
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">학년</th>
            <th className="px-4 py-3 font-medium">학생 연락처</th>
            <th className="px-4 py-3 font-medium">학부모 연락처</th>
            <th className="px-4 py-3 font-medium">메모</th>
            <th className="px-4 py-3 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {students.length === 0 && (
            <tr>
              <td colSpan={colCount + (canEditPhone ? 0 : 1)} className="px-4 py-8 text-center text-zinc-400">
                아직 등록된 학생이 없습니다.
              </td>
            </tr>
          )}

          {students.map((s) =>
            editingId === s.id ? (
              <EditRow
                key={s.id}
                student={s}
                classId={classId}
                canEditPhone={canEditPhone}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <ViewRow
                key={s.id}
                student={s}
                classId={classId}
                onEdit={() => setEditingId(s.id)}
              />
            )
          )}
        </tbody>
        <tfoot>
          <AddRow classId={classId} canEditPhone={canEditPhone} />
        </tfoot>
      </table>
    </div>
  )
}

function ViewRow({
  student: s,
  classId,
  onEdit,
}: {
  student: Student
  classId: string
  onEdit: () => void
}) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{s.name}</td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{s.grade}</td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{s.student_phone ?? '—'}</td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{s.parent_phone ?? '—'}</td>
      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{s.memo ?? '—'}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="h-8 rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            수정
          </button>
          <form
            action={deleteStudent}
            onSubmit={(e) => {
              if (!window.confirm(`${s.name} 학생을 삭제할까요?`)) e.preventDefault()
            }}
          >
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="class_id" value={classId} />
            <button
              type="submit"
              className="h-8 rounded-md border border-red-300 px-3 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40"
            >
              삭제
            </button>
          </form>
        </div>
      </td>
    </tr>
  )
}

function EditRow({
  student: s,
  classId,
  canEditPhone,
  onDone,
}: {
  student: Student
  classId: string
  canEditPhone: boolean
  onDone: () => void
}) {
  const [state, formAction] = useActionState<StudentFormState, FormData>(
    updateStudent,
    undefined
  )

  useEffect(() => {
    if (state?.ok) onDone()
  }, [state, onDone])

  const formId = `edit-${s.id}`

  return (
    <tr className="bg-zinc-50 dark:bg-zinc-900/40">
      <td className="px-4 py-2">
        <form id={formId} action={formAction}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="class_id" value={classId} />
          <input name="name" defaultValue={s.name} className={inputCls} required />
        </form>
      </td>
      <td className="px-4 py-2">
        <input form={formId} name="grade" defaultValue={s.grade} className={inputCls} required />
      </td>
      <td className="px-4 py-2">
        {canEditPhone ? (
          <input form={formId} name="student_phone" defaultValue={s.student_phone ?? ''} className={inputCls} />
        ) : (
          <span className="text-xs text-zinc-400">{s.student_phone ?? '—'}</span>
        )}
      </td>
      <td className="px-4 py-2">
        {canEditPhone ? (
          <input form={formId} name="parent_phone" defaultValue={s.parent_phone ?? ''} className={inputCls} />
        ) : (
          <span className="text-xs text-zinc-400">{s.parent_phone ?? '—'}</span>
        )}
      </td>
      <td className="px-4 py-2">
        <input form={formId} name="memo" defaultValue={s.memo ?? ''} className={inputCls} />
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <button
              type="submit"
              form={formId}
              className="h-8 rounded-md bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              저장
            </button>
            <button
              type="button"
              onClick={onDone}
              className="h-8 rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              취소
            </button>
          </div>
          {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
        </div>
      </td>
    </tr>
  )
}

function AddRow({ classId, canEditPhone }: { classId: string; canEditPhone: boolean }) {
  const [state, formAction, pending] = useActionState<StudentFormState, FormData>(
    addStudent,
    undefined
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  const formId = 'add-student'

  return (
    <>
      <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
        <td className="px-4 py-2">
          <form id={formId} ref={formRef} action={formAction}>
            <input type="hidden" name="class_id" value={classId} />
            <input name="name" placeholder="이름" className={inputCls} required />
          </form>
        </td>
        <td className="px-4 py-2">
          <input form={formId} name="grade" placeholder="예: 중2" className={inputCls} required />
        </td>
        <td className="px-4 py-2">
          {canEditPhone ? (
            <input form={formId} name="student_phone" placeholder="010-…" className={inputCls} />
          ) : (
            <span className="text-xs text-zinc-400">원장만 입력</span>
          )}
        </td>
        <td className="px-4 py-2">
          {canEditPhone ? (
            <input form={formId} name="parent_phone" placeholder="010-…" className={inputCls} />
          ) : (
            <span className="text-xs text-zinc-400">원장만 입력</span>
          )}
        </td>
        <td className="px-4 py-2">
          <input form={formId} name="memo" placeholder="메모" className={inputCls} />
        </td>
        <td className="px-4 py-2 text-right">
          <button
            type="submit"
            form={formId}
            disabled={pending}
            className="h-9 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {pending ? '추가 중…' : '+ 학생 추가'}
          </button>
        </td>
      </tr>
      {state?.error && (
        <tr>
          <td colSpan={6} className="px-4 pb-2 text-xs text-red-600">
            {state.error}
          </td>
        </tr>
      )}
    </>
  )
}
