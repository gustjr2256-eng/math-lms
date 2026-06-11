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
        {isAdmin
          ? '각 반을 눌러 학생 명단·수업을 관리합니다. 반 생성·담당 강사 지정은 [원장 통합 관리 → 정규반 관리]에서 합니다.'
          : '담당하는 정규반의 학생 명단을 관리할 수 있습니다.'}
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
