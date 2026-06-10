'use server'

import { revalidatePath } from 'next/cache'
import { requireApproved } from '@/lib/auth'

export type AttStatus = '출석' | '결석' | '지각' | '조퇴'

export type SaveAttendanceInput = {
  classId: string
  date: string
  records: { studentId: string; status: AttStatus }[]
}

// 반별·일별 출결 일괄 저장 (upsert). RLS가 담당 반만 허용.
export async function saveAttendance(input: SaveAttendanceInput) {
  const { supabase } = await requireApproved()

  const rows = input.records.map((r) => ({
    class_id: input.classId,
    student_id: r.studentId,
    date: input.date,
    status: r.status,
  }))

  if (rows.length === 0) return { ok: true }

  const { error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'class_id,student_id,date' })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/classes/${input.classId}/attendance`)
  revalidatePath(`/classes/${input.classId}`)
  return { ok: true }
}
