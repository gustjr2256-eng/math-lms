import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

// 로그인 후 랜딩. proxy가 approved 유저만 통과시킨다.
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('users').select('name, role').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.role === 'admin'

  const cards = [
    {
      href: '/classes',
      title: '반 관리',
      desc: isAdmin
        ? '반을 만들고 담당 강사를 지정하며, 반별 학생 명단을 관리합니다.'
        : '담당하는 반의 학생 명단과 수업을 관리합니다.',
      cta: '반 관리로 이동',
    },
    {
      href: '/materials',
      title: '내부 자료실',
      desc: '문제지·교재·오답노트를 학년/분류별로 업로드하고 관리합니다. 강사진 전용 공간입니다.',
      cta: '자료실로 이동',
    },
    {
      href: '/calendar',
      title: '학원 캘린더',
      desc: '내신 대비·방학 등 기간 일정과 시험·보강 같은 특정일 일정을 월간 달력에서 한눈에 봅니다.',
      cta: '캘린더로 이동',
    },
    ...(isAdmin
      ? [
          {
            href: '/admin/students',
            title: '학생 통합 관리',
            desc: '전체 학생의 상태(신규·재원·퇴원)와 반 배정을 관리합니다. 원장 전용입니다.',
            cta: '학생 통합 관리로 이동',
          },
          {
            href: '/admin/teachers',
            title: '강사 관리',
            desc: '강사 가입 승인 및 계정 상태를 관리합니다. 원장 전용입니다.',
            cta: '강사 승인·관리로 이동',
          },
        ]
      : []),
  ]

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">
        {profile?.name ?? '사용자'} 님, 환영합니다 👋
      </h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">
        승인된 {isAdmin ? '원장' : '강사'} 계정으로 로그인했습니다. 아래에서 작업을 시작하세요.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.href}
            className="flex flex-col rounded-2xl border border-cream-line bg-cream-card p-6 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <h2 className="text-base font-semibold text-brand dark:text-zinc-50">{c.title}</h2>
            <p className="mt-1 flex-1 text-sm text-brand/70 dark:text-zinc-400">{c.desc}</p>
            <Link
              href={c.href}
              className="mt-4 inline-flex h-10 w-fit items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              {c.cta} →
            </Link>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
