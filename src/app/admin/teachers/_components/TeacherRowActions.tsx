'use client'

import { useState } from 'react'
import {
  approveTeacher,
  suspendTeacher,
  reactivateTeacher,
  deleteTeacher,
} from '@/app/actions/admin'
import { TeacherPermissionsModal } from './TeacherPermissionsModal'
import { type PermissionKey } from '@/lib/permissions'

type Status = 'pending' | 'approved' | 'suspended'

const baseBtn =
  'h-8 rounded-md px-3 text-xs font-medium transition-colors disabled:opacity-50'

// 강사 한 명에 대한 상태 전환 버튼들.
export function TeacherRowActions({
  userId,
  status,
  name,
  permissions,
}: {
  userId: string
  status: Status
  name: string
  permissions: Record<PermissionKey, boolean>
}) {
  const [permOpen, setPermOpen] = useState(false)

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {status !== 'approved' && (
        <ActionForm
          action={status === 'pending' ? approveTeacher : reactivateTeacher}
          userId={userId}
        >
          <button
            type="submit"
            className={`${baseBtn} bg-emerald-600 text-white hover:bg-emerald-500`}
          >
            {status === 'pending' ? '승인' : '정지 해제'}
          </button>
        </ActionForm>
      )}

      {status === 'approved' && (
        <ActionForm action={suspendTeacher} userId={userId}>
          <button
            type="submit"
            className={`${baseBtn} bg-amber-500 text-white hover:bg-amber-400`}
          >
            정지
          </button>
        </ActionForm>
      )}

      {status === 'approved' && (
        <>
          <button
            type="button"
            onClick={() => setPermOpen(true)}
            className={`${baseBtn} border border-cream-line text-brand hover:bg-brand-tint dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800`}
          >
            권한 설정
          </button>
          {permOpen && (
            <TeacherPermissionsModal
              userId={userId}
              name={name}
              current={permissions}
              onClose={() => setPermOpen(false)}
            />
          )}
        </>
      )}

      <ActionForm
        action={deleteTeacher}
        userId={userId}
        confirmMessage="이 강사 계정을 삭제하면 되돌릴 수 없습니다. 삭제할까요?"
      >
        <button
          type="submit"
          className={`${baseBtn} border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40`}
        >
          삭제
        </button>
      </ActionForm>
    </div>
  )
}

function ActionForm({
  action,
  userId,
  confirmMessage,
  children,
}: {
  action: (formData: FormData) => Promise<void>
  userId: string
  confirmMessage?: string
  children: React.ReactNode
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      {children}
    </form>
  )
}
