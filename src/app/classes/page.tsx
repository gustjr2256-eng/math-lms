import { requireApproved } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { ClassGrid, type GridClass } from '@/components/classes/ClassGrid'

// 정규반 운영 목록. 원장은 전체, 강사는 본인 담당 반만(RLS 자동 필터).
export default async function ClassesPage() {
  const { supabase, isAdmin, profile } = await requireApproved()

  const { data } = await supabase
    .from('classes')
    .select(
      'id, name, subject, day_of_week, time, teacher:users!classes_teacher_id_fkey(name), students!students_class_id_fkey(count)'
    )
    .eq('class_type', 'regular')
    .order('created_at', { ascending: false })

  const classes = (data ?? []) as unknown as GridClass[]

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">
        {isAdmin ? '전체 정규반' : '담당 정규반'}
      </h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
        담당 선생님들은 해당반에 들어가 학생출석, 진도, 성적, 숙제를 관리해주세요.
      </p>

      <div className="mt-6">
        <ClassGrid
          classes={classes}
          emptyText={isAdmin ? '아직 생성된 정규반이 없습니다.' : '담당하는 정규반이 없습니다.'}
        />
      </div>
    </AppShell>
  )
}
