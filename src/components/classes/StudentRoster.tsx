import { STATUS_BADGE, STATUS_LABEL, type StudentStatus } from '@/lib/students'

export type Student = {
  id: string
  name: string
  grade: string
  status: StudentStatus
  student_phone: string | null
  parent_phone: string | null
  memo: string | null
}

// 반별 학생 명단 — 읽기 전용 뷰.
// 학생 등록/수정/삭제·상태변경·반배정은 원장 전용 [학생 통합 관리]에서만 가능하다.
// (강사 화면에는 이 화면의 어떤 편집 버튼도 노출되지 않는다.)
// 강사에게는 students_view 가 ACTIVE(재원) 학생만, 전화번호는 마스킹해 내려준다.
export function StudentRoster({
  students,
  showStatus = false,
}: {
  students: Student[]
  showStatus?: boolean
}) {
  return (
    <div className="overflow-x-auto app-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800">
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">학년</th>
            {showStatus && <th className="px-4 py-3 font-medium">상태</th>}
            <th className="px-4 py-3 font-medium">학생 연락처</th>
            <th className="px-4 py-3 font-medium">학부모 연락처</th>
            <th className="px-4 py-3 font-medium">메모</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {students.length === 0 ? (
            <tr>
              <td colSpan={showStatus ? 6 : 5} className="px-4 py-8 text-center text-zinc-400">
                표시할 학생이 없습니다.
              </td>
            </tr>
          ) : (
            students.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{s.name}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{s.grade}</td>
                {showStatus && (
                  <td className="px-4 py-3">
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-xs font-medium ' + STATUS_BADGE[s.status]
                      }
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{s.student_phone ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{s.parent_phone ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{s.memo ?? '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
