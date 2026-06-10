// 데모용 시드 스크립트.
// 실행: node --env-file=.env.local scripts/seed.mjs
// (.env.local 의 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 사용)
//
// 만드는 것: 임시 원장/강사 계정(승인됨) + 샘플 반/학생/숙제/출석/성적/진도.
// 여러 번 실행해도 안전(이미 있으면 건너뜀).

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

const OWNER = { email: 'owner@example.com', password: 'Owner1234!', name: '데모원장' }
const TEACHER = { email: 'teacher@example.com', password: 'Teacher1234!', name: '김강사' }

function todayPlus(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function findUserIdByEmail(email) {
  // 페이지네이션 단순 처리(데모 규모)
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const u = data.users.find((x) => x.email === email)
    if (u) return u.id
    if (data.users.length < 200) break
  }
  return null
}

async function ensureUser({ email, password, name }, role) {
  let id = await findUserIdByEmail(email)
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })
    if (error) throw error
    id = data.user.id
    console.log(`  + 계정 생성: ${email}`)
  } else {
    console.log(`  = 계정 존재: ${email}`)
  }
  // 트리거 작동 여부와 무관하게 public.users 행을 직접 보장 (upsert + 승인)
  const { error: upErr } = await admin
    .from('users')
    .upsert(
      { id, email, name, role, status: 'approved', approved_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
  if (upErr) throw upErr
  return id
}

async function main() {
  console.log('1) 계정 시드')
  const ownerId = await ensureUser(OWNER, 'admin')
  const teacherId = await ensureUser(TEACHER, 'teacher')

  console.log('2) 반 시드')
  let { data: cls } = await admin
    .from('classes')
    .select('id')
    .eq('name', '중2 심화 A')
    .maybeSingle()
  if (!cls) {
    const { data, error } = await admin
      .from('classes')
      .insert({
        name: '중2 심화 A',
        subject: '수학',
        day_of_week: '월,수,금',
        time: '19:00~21:00',
        teacher_id: teacherId,
      })
      .select('id')
      .single()
    if (error) throw error
    cls = data
    console.log('  + 반 생성: 중2 심화 A')
  } else {
    console.log('  = 반 존재: 중2 심화 A')
  }
  const classId = cls.id

  console.log('3) 학생 시드')
  const { data: existingStudents } = await admin
    .from('students')
    .select('id, name')
    .eq('class_id', classId)
  let students = existingStudents ?? []
  if (students.length === 0) {
    const seedStudents = [
      { name: '김민준', grade: '중2', student_phone: '010-1111-0001', parent_phone: '010-2222-0001' },
      { name: '이서연', grade: '중2', student_phone: '010-1111-0002', parent_phone: '010-2222-0002' },
      { name: '박지호', grade: '중2', student_phone: '010-1111-0003', parent_phone: '010-2222-0003' },
      { name: '최예린', grade: '중2', student_phone: '010-1111-0004', parent_phone: '010-2222-0004' },
    ].map((s) => ({ ...s, class_id: classId }))
    const { data, error } = await admin.from('students').insert(seedStudents).select('id, name')
    if (error) throw error
    students = data
    console.log(`  + 학생 ${students.length}명 생성`)
  } else {
    console.log(`  = 학생 ${students.length}명 존재`)
  }

  console.log('4) 출석/성적/진도 샘플')
  // 출석: 오늘 일부
  await admin.from('attendance').upsert(
    students.map((s, i) => ({
      class_id: classId,
      student_id: s.id,
      date: todayPlus(0),
      status: i === 0 ? '지각' : i === 3 ? '결석' : '출석',
    })),
    { onConflict: 'class_id,student_id,date' }
  )

  // 시험 + 점수
  let { data: test } = await admin
    .from('tests')
    .select('id')
    .eq('class_id', classId)
    .eq('title', '1주차 모의고사')
    .maybeSingle()
  if (!test) {
    const { data } = await admin
      .from('tests')
      .insert({ class_id: classId, kind: '주간', title: '1주차 모의고사', test_date: todayPlus(-2), full_score: 100 })
      .select('id')
      .single()
    test = data
    await admin.from('test_scores').upsert(
      students.map((s, i) => ({ test_id: test.id, student_id: s.id, score: [88, 92, 76, 64][i] ?? 80 })),
      { onConflict: 'test_id,student_id' }
    )
    console.log('  + 시험/점수 생성')
  }

  // 진도
  const { data: prog } = await admin.from('progress').select('id').eq('class_id', classId).limit(1)
  if (!prog || prog.length === 0) {
    await admin.from('progress').insert({
      class_id: classId,
      date: todayPlus(0),
      textbook: '쎈 수학(상)',
      chapter: '이차함수',
      page_from: 120,
      page_to: 138,
      memo: '그래프 평행이동까지',
    })
    console.log('  + 진도 생성')
  }

  console.log('5) 숙제 시드')
  const { data: hw } = await admin.from('homework').select('id').eq('class_id', classId).limit(1)
  if (!hw || hw.length === 0) {
    await admin.from('homework').insert({
      class_id: classId,
      title: '3단원 워크북 p.12~20',
      due_date: todayPlus(3),
      description: '풀이 과정까지 사진으로 제출하세요.',
    })
    console.log('  + 숙제 생성')
  }

  console.log('\n✅ 시드 완료!')
  console.log('────────────────────────────────────')
  console.log(`원장 로그인 : ${OWNER.email} / ${OWNER.password}`)
  console.log(`강사 로그인 : ${TEACHER.email} / ${TEACHER.password}`)
  console.log('────────────────────────────────────')
}

main().catch((e) => {
  console.error('시드 실패:', e.message ?? e)
  process.exit(1)
})
