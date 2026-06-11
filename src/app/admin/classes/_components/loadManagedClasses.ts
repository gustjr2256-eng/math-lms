import 'server-only'
import { requireAdmin } from '@/lib/auth'
import type { ManagedClass } from '@/app/admin/students/_components/ClassManager'

type Row = {
  id: string
  name: string
  subject: string
  day_of_week: string
  time: string
  teacher_id: string
  teacher: { name: string } | { name: string }[] | null
  students: { count: number }[]
}

function teacherName(t: Row['teacher']): string {
  const one = Array.isArray(t) ? t[0] : t
  return one?.name ?? '미지정'
}

// 정규반/클리닉반 CRUD 관리 페이지 공용 조회. class_type 으로만 분기.
export async function loadManagedClasses(classType: 'regular' | 'clinic') {
  const { supabase } = await requireAdmin()
  const [classesRes, teachersRes] = await Promise.all([
    supabase
      .from('classes')
      .select(
        'id, name, subject, day_of_week, time, teacher_id, teacher:users!classes_teacher_id_fkey(name), students!students_class_id_fkey(count)'
      )
      .eq('class_type', classType)
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, name')
      .eq('role', 'teacher')
      .eq('status', 'approved')
      .order('name'),
  ])

  const rows = (classesRes.data ?? []) as unknown as Row[]
  const classes: ManagedClass[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    day_of_week: c.day_of_week,
    time: c.time,
    teacher_id: c.teacher_id,
    teacherName: teacherName(c.teacher),
    studentCount: c.students?.[0]?.count ?? 0,
  }))
  const teachers = (teachersRes.data ?? []) as { id: string; name: string }[]
  return { classes, teachers }
}
