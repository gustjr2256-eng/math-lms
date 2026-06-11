import Link from 'next/link'
import { requireApproved } from '@/lib/auth'
import { StudentRoster, type Student } from '@/components/classes/StudentRoster'

// 학생 명단 탭(읽기 전용).
//  - 강사: students_view 가 ACTIVE(재원) 학생만, 전화번호는 마스킹해 내려준다.
//  - 원장: 전체 상태의 학생이 보이며, 편집은 [학생 통합 관리]로 이동.
export default async function StudentsTab({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, isAdmin } = await requireApproved()

  const { data } = await supabase
    .from('students_view')
    .select('id, name, grade, status, student_phone, parent_phone, memo')
    .eq('class_id', id)
    .order('name')

  const students = (data ?? []) as Student[]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          학생 명단{' '}
          <span className="text-sm font-normal text-zinc-400">{students.length}명</span>
        </h2>
        {isAdmin && (
          <Link
            href="/admin/students"
            className="inline-flex h-9 items-center rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            학생 통합 관리 →
          </Link>
        )}
      </div>

      {isAdmin ? (
        <p className="mb-4 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          전체 상태(신규·재원·퇴원)의 학생이 표시됩니다. 등록·상태변경·반배정은 [학생 통합 관리]에서
          하세요.
        </p>
      ) : (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          재원(ACTIVE) 학생만 표시되며 전화번호는 마스킹됩니다. 학생 등록·상태·반배정은 원장만
          관리할 수 있습니다.
        </p>
      )}

      <StudentRoster students={students} showStatus={isAdmin} />
    </div>
  )
}
