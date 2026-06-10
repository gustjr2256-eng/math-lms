import { requireApproved } from '@/lib/auth'
import { StudentRoster, type Student } from '@/components/classes/StudentRoster'

// 학생 명단 탭. 전화번호는 강사에게 마스킹(students_view).
export default async function StudentsTab({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, isAdmin } = await requireApproved()

  const { data } = await supabase
    .from('students_view')
    .select('id, name, grade, student_phone, parent_phone, memo')
    .eq('class_id', id)
    .order('name')

  const students = (data ?? []) as Student[]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          학생 명단 <span className="text-sm font-normal text-zinc-400">{students.length}명</span>
        </h2>
      </div>

      {!isAdmin && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          전화번호는 보호를 위해 마스킹되어 표시되며, 강사는 수정할 수 없습니다.
        </p>
      )}

      <StudentRoster classId={id} students={students} canEditPhone={isAdmin} />
    </div>
  )
}
