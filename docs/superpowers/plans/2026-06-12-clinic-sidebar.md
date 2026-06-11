# 클리닉반 시스템 + 사이드바 재편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 정규반과 코드를 공유하되 숙제가 빠진 '클리닉반'(class_type)·'클리닉 자료실'(scope)을 추가하고, 사이드바를 [클래스]·[클리닉반 관리]·[원장 통합 관리] 그룹으로 재편하며 모든 그룹을 기본 열림으로 만든다.

**Architecture:** `classes.class_type`/`materials.scope` enum 컬럼으로 정규/클리닉을 구분(테이블·RLS·뷰 공유, 쿼리 필터만 다름). 반 상세 라우트는 `/classes/[id]` 하나를 공용(레이아웃이 class_type을 읽어 숙제 탭 on/off). 목록은 `/classes`(정규)·`/clinic`(클리닉)으로, 자료실은 `/materials`·`/clinic/materials`로, 반 CRUD는 `/admin/classes`·`/admin/clinics`로 분리. 사이드바는 `NAV_GROUPS` 배열을 그룹별 `<NavAccordion>`(기본 open=true)로 렌더.

**Tech Stack:** Next.js 16.2.9(App Router, server actions), @supabase/ssr, PostgreSQL/Supabase RLS, Tailwind v4(크림/마룬), framer-motion, zod.

**검증 관행:** 테스트 프레임워크 없음. 각 태스크는 `npx tsc --noEmit`, 마지막에 `npx next build`로 검증. 커밋은 사용자 요청 시에만.

---

## File Structure

**생성:**
- `supabase/migrations/0011_clinic.sql`
- `src/components/classes/ClassGrid.tsx` — /classes·/clinic 공용 목록 그리드
- `src/app/clinic/page.tsx` — 클리닉반 운영 목록
- `src/app/clinic/materials/page.tsx` — 클리닉 자료실
- `src/app/admin/classes/page.tsx` + `src/app/admin/clinics/page.tsx` — 반 CRUD 관리(정규/클리닉)
- `src/app/admin/classes/_components/ClassAdmin.tsx` — 두 페이지 공용 클라이언트 래퍼(ClassManager + classType)

**수정:**
- `src/components/layout/nav.ts` — NAV_GROUPS 배열 + adminOnly + currentLabel/isActive
- `src/components/layout/Sidebar.tsx` — 다중 그룹 아코디언(기본 open)
- `src/app/actions/classes.ts` — class_type 파라미터 + revalidate 경로
- `src/app/admin/students/_components/ClassFormModal.tsx` — class_type hidden 전달
- `src/app/admin/students/_components/ClassManager.tsx` — classType prop
- `src/app/admin/students/page.tsx` — ClassManager 섹션 제거(학생만)
- `src/app/classes/page.tsx` — regular 필터 + ClassGrid 사용
- `src/app/classes/[id]/layout.tsx` — class_type 조회 → isHomeworkEnabled
- `src/components/classes/ClassTabs.tsx` — isHomeworkEnabled prop
- `src/app/classes/[id]/homework/page.tsx` — clinic 가드
- `src/app/actions/materials.ts` — createMaterial scope
- `src/components/materials/MaterialFormModal.tsx` — scope hidden
- `src/components/materials/MaterialsBrowser.tsx` — scope prop 전달(create용)
- `src/app/materials/page.tsx` — regular 필터

---

## Task 1: 마이그레이션 0011

**Files:** Create `supabase/migrations/0011_clinic.sql`

- [ ] **Step 1: 작성**
```sql
-- 0011 — 클리닉반(class_type) + 클리닉 자료실(scope). 0010 이후 실행.
do $$ begin
  create type class_type as enum ('regular','clinic');
exception when duplicate_object then null; end $$;
alter table classes add column if not exists class_type class_type not null default 'regular';

do $$ begin
  create type material_scope as enum ('regular','clinic');
exception when duplicate_object then null; end $$;
alter table materials add column if not exists scope material_scope not null default 'regular';
```
- [ ] **Step 2: 검증** — DDL은 SQL Editor 적용(이전 단계 동일). 기존 행은 default로 regular. 최종 보고에 적용 안내 포함.

---

## Task 2: nav.ts 재구성

**Files:** Modify `src/components/layout/nav.ts`

- [ ] **Step 1: 전체 교체**
```ts
// 사이드바/상단바가 공유하는 내비게이션 정의.

export type NavItem = { href: string; label: string; icon: string }
export type NavGroup = { label: string; icon: string; adminOnly?: boolean; children: NavItem[] }

// 상단 flat 메뉴(전 강사·원장)
export const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: '🏠' },
  { href: '/calendar', label: '캘린더', icon: '🗓️' },
  { href: '/timetable', label: '시간표', icon: '⏰' },
]

// 그룹(아코디언)
export const NAV_GROUPS: NavGroup[] = [
  {
    label: '클래스',
    icon: '📚',
    children: [
      { href: '/classes', label: '정규반 관리', icon: '📘' },
      { href: '/materials', label: '자료실', icon: '📎' },
    ],
  },
  {
    label: '클리닉반 관리',
    icon: '🩺',
    children: [
      { href: '/clinic', label: '클리닉반 관리', icon: '🧪' },
      { href: '/clinic/materials', label: '클리닉 자료실', icon: '📐' },
    ],
  },
  {
    label: '원장 통합 관리',
    icon: '🛡️',
    adminOnly: true,
    children: [
      { href: '/admin/students', label: '학생 통합 관리', icon: '🎓' },
      { href: '/admin/classes', label: '정규반 관리', icon: '📘' },
      { href: '/admin/clinics', label: '클리닉반 관리', icon: '🧪' },
      { href: '/admin/teachers', label: '강사 관리', icon: '🧑‍🏫' },
      { href: '/admin/announcements', label: '공지 관리', icon: '📢' },
      { href: '/admin/messages', label: '메시지 발송', icon: '✉️' },
      { href: '/admin/settings', label: '학원 설정', icon: '⚙️' },
    ],
  },
]

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

// 현재 경로에 해당하는 메뉴 라벨(상단바 제목용). 더 긴(구체적) href 우선 매칭.
export function currentLabel(pathname: string): string {
  const all = [...MAIN_NAV, ...NAV_GROUPS.flatMap((g) => g.children)]
  const hit = all
    .filter((n) => isActive(pathname, n.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return hit?.label ?? '수학학원 LMS'
}
```
주의: `/admin/classes`와 `/classes`는 `isActive('/admin/classes','/classes')`가 false(startsWith '/classes/' 아님)라 충돌 없음. `/clinic`과 `/clinic/materials`는 길이 정렬로 구체 경로 우선.

- [ ] **Step 2: 검증** `npx tsc --noEmit` — TopBar/Sidebar가 ADMIN_GROUP를 import하므로 Task 3에서 함께 수정해야 통과(아래). 이 태스크 단독 tsc는 Task3 후 실행.

---

## Task 3: Sidebar 다중 그룹 아코디언(기본 열림)

**Files:** Modify `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBar.tsx`(import 확인)

- [ ] **Step 1: Sidebar 전체 교체**
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MAIN_NAV, NAV_GROUPS, isActive, type NavItem, type NavGroup } from './nav'
import { LogoutButton } from '@/components/auth/LogoutButton'

const springHover = { type: 'spring' as const, stiffness: 400, damping: 17 }

export function Sidebar({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const groups = NAV_GROUPS.filter((g) => !g.adminOnly || isAdmin)

  return (
    <div className="flex h-full w-[280px] flex-col bg-cream-deep dark:bg-zinc-950">
      <Link href="/" onClick={onNavigate} className="block px-5 py-5">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={springHover} className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-base font-bold text-white">M</div>
          <div className="leading-tight">
            <div className="font-paperozi text-base font-bold text-brand dark:text-cream">수학학원 LMS</div>
            <div className="font-pretendard text-[11px] text-brand/60 dark:text-zinc-400">{isAdmin ? '원장' : '강사'} 콘솔</div>
          </div>
        </motion.div>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {MAIN_NAV.map((it) => (
          <MenuLink key={it.href} item={it} active={isActive(pathname, it.href)} onNavigate={onNavigate} />
        ))}
        {groups.map((g) => (
          <NavAccordion key={g.label} group={g} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-cream-line px-3 py-3 dark:border-zinc-800">
        <LogoutButton className="h-9 w-full rounded-lg border border-cream-line bg-white/60 px-3 font-pretendard text-sm font-medium text-brand transition-colors hover:bg-white dark:border-zinc-700 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800" />
      </div>
    </div>
  )
}

// 그룹 아코디언 — 기본 열림(open=true). 사용자가 닫기 전까지 펼침 유지.
function NavAccordion({ group, pathname, onNavigate }: { group: NavGroup; pathname: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(true)
  const groupActive = group.children.some((c) => isActive(pathname, c.href))

  return (
    <div className="pt-2">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        transition={springHover}
        className={
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-pretendard text-sm font-semibold transition-colors ' +
          (groupActive ? 'text-brand dark:text-zinc-100' : 'text-brand/80 hover:bg-brand-tint dark:text-zinc-300 dark:hover:bg-zinc-800')
        }
        aria-expanded={open}
      >
        <span className="text-base">{group.icon}</span>
        {group.label}
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={springHover} className="ml-auto text-xs text-brand/50 dark:text-zinc-500">▶</motion.span>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden pl-3"
          >
            {group.children.map((c) => (
              <li key={c.href} className="mt-1">
                <MenuLink item={c} active={isActive(pathname, c.href)} onNavigate={onNavigate} nested />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuLink({ item, active, onNavigate, nested = false }: { item: NavItem; active: boolean; onNavigate?: () => void; nested?: boolean }) {
  return (
    <Link href={item.href} onClick={onNavigate}>
      <motion.div
        whileHover={{ x: 6, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={springHover}
        className={
          'flex items-center gap-3 rounded-xl px-3 font-pretendard font-semibold transition-colors ' +
          (nested ? 'py-2 text-[13px]' : 'py-2.5 text-sm') + ' ' +
          (active ? 'bg-brand text-white shadow-sm' : 'text-brand/80 hover:bg-brand-tint dark:text-zinc-300 dark:hover:bg-zinc-800')
        }
      >
        <span className={nested ? 'text-sm' : 'text-base'}>{item.icon}</span>
        {item.label}
      </motion.div>
    </Link>
  )
}
```

- [ ] **Step 2: TopBar import 확인** — `currentLabel`만 쓰면 무영향. `MAIN_NAV`/`ADMIN_GROUP` 직접 import 시 `ADMIN_GROUP` 제거됐으므로 `NAV_GROUPS`로 교체. (Task 실행 시 `grep ADMIN_GROUP src/` 로 잔존 참조 모두 수정.)

- [ ] **Step 3: 검증** `npx tsc --noEmit` → 통과.

---

## Task 4: classes 액션 + ClassFormModal/Manager class_type

**Files:** Modify `src/app/actions/classes.ts`, `ClassFormModal.tsx`, `ClassManager.tsx`

- [ ] **Step 1: classes.ts schema/insert 에 class_type 추가**
classSchema에 추가:
```ts
  teacher_id: z.string().uuid({ message: '담당 강사를 선택하세요.' }),
  class_type: z.enum(['regular', 'clinic']).default('regular'),
```
createClass·updateClass의 safeParse 입력에 `class_type: formData.get('class_type') ?? 'regular'` 추가. insert/update는 `parsed.data` 그대로(혹은 update는 class_type 제외하고 싶으면 유지 — 유지로 둠). 두 액션 끝 revalidate에 추가:
```ts
  revalidatePath('/clinic')
  revalidatePath('/admin/classes')
  revalidatePath('/admin/clinics')
```

- [ ] **Step 2: ClassFormModal 에 classType 전달**
`ClassFormModal` props에 `classType?: 'regular' | 'clinic'` 추가(기본 'regular'). form 안에 hidden 추가:
```tsx
<input type="hidden" name="class_type" value={classType} />
```
edit 모드에서도 기존 타입 유지하도록 cls에 class_type 포함 가능하나, 같은 관리 페이지 내 편집이므로 페이지의 classType를 그대로 사용.

- [ ] **Step 3: ClassManager 에 classType prop**
`ClassManager` props에 `classType: 'regular' | 'clinic'` 추가. 제목/버튼 라벨을 타입별로:
```tsx
const typeLabel = classType === 'clinic' ? '클리닉반' : '정규반'
```
헤더 `반 관리` → `{typeLabel} 관리`, 버튼 `+ 새 반 만들기` → `+ 새 {typeLabel} 만들기`. ClassFormModal 호출에 `classType={classType}` 전달. (create/edit 둘 다)

- [ ] **Step 4: 검증** `npx tsc --noEmit` → 통과(아직 admin 페이지 미생성이라 ClassManager 호출부는 Task 7에서 맞춤).

---

## Task 5: ClassGrid 공용 + /classes(regular) + /clinic

**Files:** Create `src/components/classes/ClassGrid.tsx`, `src/app/clinic/page.tsx`; Modify `src/app/classes/page.tsx`

- [ ] **Step 1: ClassGrid 작성**
```tsx
import Link from 'next/link'

export type GridClass = {
  id: string
  name: string
  subject: string
  day_of_week: string
  time: string
  teacher: { name: string } | { name: string }[] | null
  students: { count: number }[]
}

function oneTeacher(t: GridClass['teacher']): { name: string } | null {
  return Array.isArray(t) ? t[0] ?? null : t
}

// /classes·/clinic 공용 반 목록 그리드.
export function ClassGrid({ classes, emptyText }: { classes: GridClass[]; emptyText: string }) {
  if (classes.length === 0) {
    return (
      <p className="col-span-full rounded-xl border border-dashed border-cream-line px-4 py-10 text-center text-sm text-brand/50 dark:border-zinc-700 dark:text-zinc-400">
        {emptyText}
      </p>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {classes.map((c) => (
        <Link
          key={c.id}
          href={`/classes/${c.id}`}
          className="rounded-2xl border border-cream-line bg-cream-card p-5 transition-colors hover:border-brand/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brand dark:text-zinc-50">{c.name}</h2>
            <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs text-brand dark:bg-zinc-800 dark:text-zinc-300">
              학생 {c.students?.[0]?.count ?? 0}명
            </span>
          </div>
          <p className="mt-1 text-sm text-brand/70 dark:text-zinc-400">{c.subject} · {c.day_of_week} · {c.time}</p>
          <p className="mt-3 text-xs text-brand/50 dark:text-zinc-400">담당 강사: {oneTeacher(c.teacher)?.name ?? '미지정'}</p>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: /classes/page.tsx 를 regular 필터 + ClassGrid 로 교체**
```tsx
import { requireApproved } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { ClassGrid, type GridClass } from '@/components/classes/ClassGrid'

export default async function ClassesPage() {
  const { supabase, isAdmin, profile } = await requireApproved()
  const { data } = await supabase
    .from('classes')
    .select('id, name, subject, day_of_week, time, teacher:users!classes_teacher_id_fkey(name), students!students_class_id_fkey(count)')
    .eq('class_type', 'regular')
    .order('created_at', { ascending: false })
  const classes = (data ?? []) as unknown as GridClass[]

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">{isAdmin ? '전체 정규반' : '담당 정규반'}</h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">각 반을 눌러 학생 명단·수업을 관리합니다. 반 생성·담당 강사 지정은 [원장 통합 관리 → 정규반 관리]에서 합니다.</p>
      <div className="mt-6">
        <ClassGrid classes={classes} emptyText={isAdmin ? '아직 생성된 정규반이 없습니다.' : '담당하는 정규반이 없습니다.'} />
      </div>
    </AppShell>
  )
}
```
주의: `class_type` 컬럼 미적용(0011 전)이면 `.eq('class_type','regular')`가 에러 → data null → 빈 목록(graceful). 적용 후 정상.

- [ ] **Step 3: /clinic/page.tsx 작성**
```tsx
import { requireApproved } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { ClassGrid, type GridClass } from '@/components/classes/ClassGrid'

export default async function ClinicPage() {
  const { supabase, isAdmin, profile } = await requireApproved()
  const { data } = await supabase
    .from('classes')
    .select('id, name, subject, day_of_week, time, teacher:users!classes_teacher_id_fkey(name), students!students_class_id_fkey(count)')
    .eq('class_type', 'clinic')
    .order('created_at', { ascending: false })
  const classes = (data ?? []) as unknown as GridClass[]

  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">{isAdmin ? '전체 클리닉반' : '담당 클리닉반'}</h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">클리닉반은 출석·성적·진도를 관리합니다(숙제 기능 없음). 반 생성은 [원장 통합 관리 → 클리닉반 관리]에서 합니다.</p>
      <div className="mt-6">
        <ClassGrid classes={classes} emptyText={isAdmin ? '아직 생성된 클리닉반이 없습니다.' : '담당하는 클리닉반이 없습니다.'} />
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 4: 검증** `npx tsc --noEmit` → 통과.

---

## Task 6: 반 상세 숙제 토글 + 가드

**Files:** Modify `ClassTabs.tsx`, `classes/[id]/layout.tsx`, `classes/[id]/homework/page.tsx`

- [ ] **Step 1: ClassTabs isHomeworkEnabled prop**
```tsx
export function ClassTabs({ classId, isHomeworkEnabled = true }: { classId: string; isHomeworkEnabled?: boolean }) {
  const pathname = usePathname()
  const base = `/classes/${classId}`
  const tabs = [
    { href: base, label: '요약', exact: true },
    { href: `${base}/students`, label: '학생' },
    { href: `${base}/attendance`, label: '출석' },
    { href: `${base}/tests`, label: '성적' },
    { href: `${base}/progress`, label: '진도' },
    ...(isHomeworkEnabled ? [{ href: `${base}/homework`, label: '숙제' }] : []),
  ]
  // ...(이하 기존 렌더 동일)
```
(나머지 JSX는 기존 그대로 유지)

- [ ] **Step 2: layout.tsx 에서 class_type 조회 → 전달**
select에 `class_type` 추가:
```tsx
  const { data: cls } = await supabase
    .from('classes')
    .select('id, name, subject, day_of_week, time, class_type, teacher:users!classes_teacher_id_fkey(name)')
    .eq('id', id)
    .maybeSingle()
```
헤더에 클리닉 배지(선택) + ClassTabs 호출 변경:
```tsx
  const isClinic = (cls as { class_type?: string }).class_type === 'clinic'
  // ...
        <ClassTabs classId={id} isHomeworkEnabled={!isClinic} />
```
class_type 컬럼 없으면 undefined → isClinic=false → 기존과 동일(숙제 표시). graceful.

- [ ] **Step 3: homework/page.tsx 가드**
파일 상단 import에 추가: `import { redirect } from 'next/navigation'`
`const { supabase } = await requireApproved()` 직후 추가:
```tsx
  const { data: clsType } = await supabase.from('classes').select('class_type').eq('id', id).maybeSingle()
  if ((clsType as { class_type?: string } | null)?.class_type === 'clinic') {
    redirect(`/classes/${id}`)
  }
```

- [ ] **Step 4: 검증** `npx tsc --noEmit` → 통과.

---

## Task 7: 반 CRUD 관리 페이지(/admin/classes, /admin/clinics) + students 정리

**Files:** Create `src/app/admin/classes/_components/ClassAdmin.tsx`, `src/app/admin/classes/page.tsx`, `src/app/admin/clinics/page.tsx`; Modify `src/app/admin/students/page.tsx`

- [ ] **Step 1: ClassAdmin 공용 래퍼(server) — 데이터 조회 + ClassManager**
실제로는 페이지가 직접 조회하므로 별도 래퍼 대신 **공용 조회 함수**를 만든다. `src/app/admin/classes/_components/loadManagedClasses.ts`:
```ts
import 'server-only'
import { requireAdmin } from '@/lib/auth'
import type { ManagedClass } from '@/app/admin/students/_components/ClassManager'

type Row = {
  id: string; name: string; subject: string; day_of_week: string; time: string; teacher_id: string
  teacher: { name: string } | { name: string }[] | null
  students: { count: number }[]
}
function teacherName(t: Row['teacher']): string {
  const one = Array.isArray(t) ? t[0] : t
  return one?.name ?? '미지정'
}

export async function loadManagedClasses(classType: 'regular' | 'clinic') {
  const { supabase } = await requireAdmin()
  const [classesRes, teachersRes] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, subject, day_of_week, time, teacher_id, teacher:users!classes_teacher_id_fkey(name), students!students_class_id_fkey(count)')
      .eq('class_type', classType)
      .order('created_at', { ascending: false }),
    supabase.from('users').select('id, name').eq('role', 'teacher').eq('status', 'approved').order('name'),
  ])
  const rows = (classesRes.data ?? []) as unknown as Row[]
  const classes: ManagedClass[] = rows.map((c) => ({
    id: c.id, name: c.name, subject: c.subject, day_of_week: c.day_of_week, time: c.time,
    teacher_id: c.teacher_id, teacherName: teacherName(c.teacher), studentCount: c.students?.[0]?.count ?? 0,
  }))
  const teachers = (teachersRes.data ?? []) as { id: string; name: string }[]
  return { classes, teachers }
}
```

- [ ] **Step 2: /admin/classes/page.tsx**
```tsx
import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { ClassManager } from '@/app/admin/students/_components/ClassManager'
import { loadManagedClasses } from './_components/loadManagedClasses'

export default async function AdminClassesPage() {
  const { profile } = await requireAdmin()
  const { classes, teachers } = await loadManagedClasses('regular')
  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">정규반 관리</h1>
        <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">정규반을 생성·수정·삭제하고 담당 강사를 지정합니다.</p>
        <div className="mt-6">
          <ClassManager classes={classes} teachers={teachers} classType="regular" />
        </div>
      </AdminGuard>
    </AppShell>
  )
}
```

- [ ] **Step 3: /admin/clinics/page.tsx** — 위와 동일하되 `loadManagedClasses('clinic')`, `classType="clinic"`, 제목 '클리닉반 관리', 안내 '클리닉반을 생성·수정·삭제합니다. (숙제 기능 없음)'.
```tsx
import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { ClassManager } from '@/app/admin/students/_components/ClassManager'
import { loadManagedClasses } from '../classes/_components/loadManagedClasses'

export default async function AdminClinicsPage() {
  const { profile } = await requireAdmin()
  const { classes, teachers } = await loadManagedClasses('clinic')
  return (
    <AppShell name={profile?.name} isAdmin>
      <AdminGuard isAdmin={profile?.role === 'admin'}>
        <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">클리닉반 관리</h1>
        <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">클리닉반을 생성·수정·삭제합니다. 클리닉반은 숙제 기능이 없습니다.</p>
        <div className="mt-6">
          <ClassManager classes={classes} teachers={teachers} classType="clinic" />
        </div>
      </AdminGuard>
    </AppShell>
  )
}
```

- [ ] **Step 4: /admin/students/page.tsx 에서 ClassManager 섹션 제거**
classesRes 조회는 학생 반배정 드롭다운용 classOptions 때문에 유지하되, `managedClasses`/`ClassManager` import·섹션 제거. classOptions는 classRows에서 직접 생성:
```tsx
const classOptions = classRows.map((c) => ({ id: c.id, name: c.name }))
```
`<section><ClassManager .../></section>` 블록 삭제. 안내문에 '반 생성·수정·삭제는 [정규반 관리]·[클리닉반 관리]에서' 로 갱신. import에서 `ClassManager, type ManagedClass` 제거(ManagedClass 미사용 시).

- [ ] **Step 5: 검증** `npx tsc --noEmit` → 통과.

---

## Task 8: 자료실 scope (클리닉 자료실)

**Files:** Modify `src/app/actions/materials.ts`, `MaterialFormModal.tsx`, `MaterialsBrowser.tsx`, `src/app/materials/page.tsx`; Create `src/app/clinic/materials/page.tsx`

- [ ] **Step 1: materials.ts createMaterial 에 scope**
createMaterial 액션에서 insert payload에 scope 추가. formData에서 읽기:
```ts
const scope = formData.get('scope') === 'clinic' ? 'clinic' : 'regular'
```
insert 객체에 `scope` 추가. revalidate에 `revalidatePath('/clinic/materials')` 추가. (정확한 위치는 실행 시 파일 확인 — 기존 insert 블록에 한 줄 추가.)

- [ ] **Step 2: MaterialFormModal 에 scope hidden**
`MaterialFormModal` props에 `scope?: 'regular' | 'clinic'`(기본 'regular') 추가. form 안에 `<input type="hidden" name="scope" value={scope} />` 추가. MaterialsBrowser가 modal에 scope 전달.

- [ ] **Step 3: MaterialsBrowser 에 scope prop 배선**
`MaterialsBrowser` props에 `scope?: 'regular' | 'clinic'` 추가, 내부 MaterialFormModal 호출(create/edit)에 `scope={scope}` 전달.

- [ ] **Step 4: /materials/page.tsx regular 필터**
materials select에 `.eq('scope', 'regular')` 추가. `<MaterialsBrowser ... scope="regular" />`.

- [ ] **Step 5: /clinic/materials/page.tsx 작성**
```tsx
import { requireApproved } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { MaterialsBrowser } from '@/components/materials/MaterialsBrowser'
import type { Material } from '@/lib/materials'

export default async function ClinicMaterialsPage() {
  const { supabase, user, isAdmin, profile } = await requireApproved()
  const { data } = await supabase
    .from('materials')
    .select('id, title, description, school_level, grade, category, file_path, file_name, file_size, created_by, created_at, uploader:users!materials_created_by_fkey(name)')
    .eq('scope', 'clinic')
    .order('created_at', { ascending: false })
  const materials = (data ?? []) as unknown as Material[]
  return (
    <AppShell name={profile?.name} isAdmin={isAdmin}>
      <h1 className="text-2xl font-bold text-brand dark:text-zinc-50">클리닉 자료실</h1>
      <p className="mt-2 text-sm text-brand/70 dark:text-zinc-400">클리닉반 전용 학습 자료를 등록·관리합니다. 강사진 전용입니다.</p>
      <MaterialsBrowser materials={materials} currentUserId={user.id} isAdmin={isAdmin} scope="clinic" />
    </AppShell>
  )
}
```

- [ ] **Step 6: 검증** `npx tsc --noEmit` → 통과.

---

## Task 9: 최종 빌드 + 적용 안내

- [ ] **Step 1:** `npx next build` → ✓ 통과, 신규 라우트 `/clinic`, `/clinic/materials`, `/admin/classes`, `/admin/clinics` 등장 확인.
- [ ] **Step 2:** dev 재기동 후 사이드바에 [클래스]/[클리닉반 관리]/[원장 통합 관리] 그룹이 **모두 펼쳐진** 상태로 보이는지 확인.
- [ ] **Step 3 (보고):** 사용자에게 `0011_clinic.sql` SQL Editor 적용 안내. 미적용 시 클리닉/정규 구분이 비활성(전부 regular처럼 보임)이나 크래시 없음.

---

## Self-Review

- **Spec coverage:**
  - class_type 컬럼 → Task 1 ✓ / material_scope → Task 1 ✓
  - 사이드바 3그룹 재편 → Task 2,3 ✓ / 모든 그룹 기본 열림 → Task 3 NavAccordion useState(true) ✓
  - 클리닉=정규 코드 공유 → Task 5 ClassGrid·공용 /classes/[id] ✓
  - 숙제 비활성(탭 숨김+가드) → Task 6 ✓
  - 반 관리 원장 하위 이전+정규/클리닉 세분화 → Task 7 ✓
  - 클리닉 자료실 → Task 8 ✓
- **Placeholder scan:** Task 4/8의 "기존 insert 블록에 한 줄 추가"는 실행 시 파일 확인 지시 — 구체 코드(scope/class_type 값) 명시됨. 통과.
- **Type consistency:** `ManagedClass`(ClassManager) 재사용, `GridClass`(ClassGrid) 신규, `class_type: 'regular'|'clinic'` 일관, `scope: 'regular'|'clinic'` 일관. ClassManager classType prop은 Task4에서 추가→Task7에서 사용 일치.
- **주의:** 0011 미적용 시 `.eq('class_type'/'scope', …)` 쿼리가 에러→빈 목록(graceful). 적용 후 정상. layout/guard는 컬럼 없으면 undefined→regular 취급.
