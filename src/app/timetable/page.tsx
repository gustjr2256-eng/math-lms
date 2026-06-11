import { requireApproved } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/layout/EmptyState'
import { Timetable } from '@/components/timetable/Timetable'
import { buildTeacherColors, parseClassBlocks, type RawClass } from '@/lib/timetable'

// 통합 주간 시간표 — 모든 강사가 전체 반을 읽기 전용으로 조회.
// 강사는 RLS상 본인 반/타 강사 이름을 못 보므로, 민감정보 없는 공개성 데이터(반·시간·강사명)는
// 서버에서 service role 로 모아 읽기 전용으로 렌더한다.
export default async function TimetablePage() {
  const { profile, isAdmin } = await requireApproved()

  const admin = createAdminClient()
  const [classesRes, usersRes] = await Promise.all([
    admin.from('classes').select('id, name, subject, day_of_week, time, teacher_id'),
    admin.from('users').select('id, name'),
  ])

  const nameById = new Map((usersRes.data ?? []).map((u) => [u.id, u.name as string]))
  const classes: RawClass[] = (classesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    day_of_week: c.day_of_week,
    time: c.time,
    teacherName: nameById.get(c.teacher_id) ?? '미지정',
  }))

  const colorByTeacher = buildTeacherColors(classes.map((c) => c.teacherName))
  const blocks = parseClassBlocks(classes)

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="font-paperozi text-2xl font-bold text-brand dark:text-zinc-50">주간 시간표</h1>
      <p className="mt-2 font-pretendard text-sm text-brand/70 dark:text-zinc-400">
        전체 반의 주간 수업을 강사별 색상으로 구분해 한눈에 봅니다. 모든 강사가 조회할 수 있는 읽기
        전용 화면입니다.
      </p>

      <div className="mt-8">
        {blocks.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title="표시할 수업이 없습니다"
            description="반의 요일/시간이 등록되면 시간표에 자동으로 채워집니다. (예: 요일 '월,수,금' · 시간 '15:00~17:00')"
          />
        ) : (
          <Timetable blocks={blocks} colorByTeacher={colorByTeacher} />
        )}
      </div>
    </AppShell>
  )
}
