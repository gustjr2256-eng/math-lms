'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AttendanceBoard } from '@/components/classes/AttendanceBoard'
import { ProgressForm } from '@/components/classes/ProgressForm'
import { HomeworkForm } from '@/components/homework/HomeworkForm'
import { TestCreateForm } from '@/components/classes/TestCreateForm'
import type { AttStatus } from '@/app/actions/attendance'

type Student = { id: string; name: string; grade: string }
export type DailyPerms = {
  attendance: boolean
  progress: boolean
  homework: boolean
  scores: boolean
}

type TabKey = 'attendance' | 'progress' | 'homework' | 'tests'

// 반 요약 상단의 "일일 반 관리" 버튼 + 큰 모달.
// 출석체크 / 진도작성 / 숙제추가 / 시험등록을 탭으로 통합(기존 폼 재사용).
export function DailyManageModal({
  classId,
  today,
  students,
  attInitial,
  isClinic,
  perms,
}: {
  classId: string
  today: string
  students: Student[]
  attInitial: Record<string, AttStatus>
  isClinic: boolean
  perms: DailyPerms
}) {
  const [open, setOpen] = useState(false)

  const tabs: { key: TabKey; label: string; icon: string; enabled: boolean }[] = [
    { key: 'attendance', label: '출석 체크', icon: '✅', enabled: perms.attendance },
    { key: 'progress', label: '진도 작성', icon: '📖', enabled: perms.progress },
    // 클리닉반은 숙제 기능 없음
    ...(!isClinic
      ? [{ key: 'homework' as const, label: '숙제 추가', icon: '📝', enabled: perms.homework }]
      : []),
    { key: 'tests', label: '시험 등록', icon: '🧮', enabled: perms.scores },
  ]

  const [tab, setTab] = useState<TabKey>(tabs[0].key)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 font-pretendard text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-strong dark:bg-gold dark:text-[#0a192f] dark:hover:bg-gold-strong"
      >
        📋 일일 반 관리
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-cream-card shadow-2xl ring-1 ring-cream-line dark:bg-zinc-950 dark:ring-zinc-800"
              role="dialog"
              aria-modal="true"
            >
              {/* 헤더 */}
              <div className="flex shrink-0 items-center justify-between border-b border-cream-line px-7 py-5 dark:border-zinc-800">
                <h2 className="font-paperozi text-xl font-bold text-brand dark:text-zinc-50">
                  📋 일일 반 관리
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="닫기"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-brand/60 transition-colors hover:bg-brand-tint hover:text-brand dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              {/* 탭 */}
              <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-cream-line px-5 pt-3 dark:border-zinc-800">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={
                      'shrink-0 rounded-t-lg px-4 py-2.5 font-pretendard text-sm font-semibold transition-colors ' +
                      (tab === t.key
                        ? 'bg-brand-tint text-brand dark:bg-zinc-800 dark:text-gold'
                        : 'text-brand/55 hover:text-brand dark:text-zinc-400 dark:hover:text-zinc-200')
                    }
                  >
                    <span className="mr-1">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* 내용 */}
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {tab === 'attendance' &&
                  (perms.attendance ? (
                    <AttendanceBoard
                      classId={classId}
                      date={today}
                      students={students}
                      initial={attInitial}
                      canEdit
                    />
                  ) : (
                    <NoPerm />
                  ))}

                {tab === 'progress' &&
                  (perms.progress ? <ProgressForm classId={classId} today={today} /> : <NoPerm />)}

                {tab === 'homework' &&
                  (perms.homework ? <HomeworkForm classId={classId} /> : <NoPerm />)}

                {tab === 'tests' &&
                  (perms.scores ? <TestCreateForm classId={classId} /> : <NoPerm />)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

function NoPerm() {
  return (
    <p className="rounded-xl border border-cream-line bg-cream px-4 py-12 text-center font-pretendard text-sm text-brand/45 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
      이 작업에 대한 권한이 없습니다. 원장에게 권한을 요청하세요.
    </p>
  )
}
