'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { STATUS_LABEL, STATUS_BADGE, STUDENT_STATUSES, type StudentStatus } from '@/lib/students'
import {
  getStudentDetail,
  updateStudentContacts,
  setStudentStatus,
  type StudentDetail,
  type StudentFormState,
} from '@/app/actions/students'
import type { AttStatus } from '@/app/actions/attendance'
import { PhoneInput } from '@/components/ui/PhoneInput'

// 출석 상태별 색상 배지(연한 톤)
const ATT_BADGE: Record<AttStatus, string> = {
  출석: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  지각: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  조퇴: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  결석: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
}

// 스케줄 박스용 요일 순서
const WEEK = ['월', '화', '수', '목', '금', '토', '일'] as const

const inputCls =
  'h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-brand dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100'

// 학생 상세 모달 — 이름 클릭 시. 상태·반·연락처(인라인 수정)·출결·스케줄·시험성적.
export function StudentDetailModal({
  studentId,
  fallbackName,
  onClose,
}: {
  studentId: string
  fallbackName: string
  onClose: () => void
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [statusPending, startStatus] = useTransition()
  const [state, formAction, pending] = useActionState<StudentFormState, FormData>(
    updateStudentContacts,
    undefined
  )

  // 마운트 시 상세 로드
  useEffect(() => {
    let alive = true
    getStudentDetail(studentId).then((d) => {
      if (!alive) return
      setDetail(d)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [studentId])

  // 연락처 저장 성공 → 재조회로 반영 + 편집 종료(비동기 콜백에서 setState)
  useEffect(() => {
    if (!state?.ok) return
    getStudentDetail(studentId).then((d) => {
      if (d) setDetail(d)
      setEditing(false)
    })
  }, [state, studentId])

  // 재원 상태 변경(상단 우측 셀렉트) → 저장 후 재조회로 즉시 반영
  function changeStatus(next: StudentStatus) {
    if (!detail || next === detail.status) return
    startStatus(async () => {
      const fd = new FormData()
      fd.set('id', studentId)
      fd.set('status', next)
      await setStudentStatus(fd)
      const d = await getStudentDetail(studentId)
      if (d) setDetail(d)
    })
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-cream-card p-8 shadow-2xl ring-1 ring-cream-line dark:bg-zinc-950 dark:ring-zinc-800"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-lg text-brand/50 hover:bg-brand-tint hover:text-brand dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            ✕
          </button>

          {loading ? (
            <div className="py-20 text-center font-pretendard text-sm text-brand/50 dark:text-zinc-400">
              불러오는 중…
            </div>
          ) : !detail ? (
            <div className="py-20 text-center font-pretendard text-sm text-brand/50 dark:text-zinc-400">
              {fallbackName} 학생 정보를 불러올 수 없습니다.
            </div>
          ) : (
            <>
              {/* 헤더: 좌측 정보 / 우측 재원상태 관리 */}
              <div className="flex items-start justify-between gap-4 pr-10">
                <div>
                  {/* 1) 상태 배지 · 반명 */}
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-pretendard text-xs font-semibold ' +
                        STATUS_BADGE[detail.status]
                      }
                    >
                      ● {STATUS_LABEL[detail.status]}
                    </span>
                    <span className="font-paperozi text-sm font-semibold text-brand/70 dark:text-zinc-300">
                      {detail.cls ? detail.cls.name : '반 미배정'}
                    </span>
                  </div>

                  {/* 2) 이름 + 학년·학교 */}
                  <h2 className="mt-2 font-paperozi text-3xl font-bold text-brand dark:text-zinc-50">
                    {detail.name}
                  </h2>
                  <p className="mt-1 font-pretendard text-sm text-brand/55 dark:text-zinc-400">
                    {detail.grade}
                    {detail.school ? ` · ${detail.school}` : ''}
                    {detail.cls ? ` · ${detail.cls.subject}` : ''}
                  </p>
                </div>

                {/* 재원 상태 관리 */}
                <div className="shrink-0 rounded-2xl border border-cream-line bg-cream px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <label className="block font-pretendard text-[11px] font-medium text-brand/55 dark:text-zinc-400">
                    재원 상태
                  </label>
                  <select
                    value={detail.status}
                    disabled={statusPending}
                    onChange={(e) => changeStatus(e.target.value as StudentStatus)}
                    className="mt-1 h-9 w-28 rounded-lg border border-zinc-300 bg-white px-2 font-pretendard text-sm font-semibold outline-none focus:border-brand disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
                  >
                    {STUDENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3) 연락처 박스 (인라인 수정) */}
              <div className="mt-5 rounded-2xl border border-cream-line bg-cream p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                {editing ? (
                  <form action={formAction} className="space-y-3">
                    <input type="hidden" name="id" value={detail.id} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">
                          학부모 연락처
                        </label>
                        <PhoneInput
                          name="parent_phone"
                          defaultValue={detail.parent_phone}
                          className={`mt-1 ${inputCls}`}
                        />
                      </div>
                      <div>
                        <label className="font-pretendard text-xs font-medium text-brand/60 dark:text-zinc-400">
                          학생 연락처
                        </label>
                        <PhoneInput
                          name="student_phone"
                          defaultValue={detail.student_phone}
                          className={`mt-1 ${inputCls}`}
                        />
                      </div>
                    </div>
                    {state?.error && (
                      <p className="font-pretendard text-xs text-red-600 dark:text-red-400">
                        {state.error}
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="h-9 rounded-lg border border-cream-line px-3 font-pretendard text-sm text-brand/70 hover:bg-cream dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={pending}
                        className="h-9 rounded-lg bg-brand px-4 font-pretendard text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60 dark:bg-gold dark:text-[#0a192f] dark:hover:bg-gold-strong"
                      >
                        {pending ? '저장 중…' : '저장'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                      <ContactItem label="학부모 연락처" value={detail.parent_phone} />
                      <ContactItem label="학생 연락처" value={detail.student_phone} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="shrink-0 rounded-lg border border-brand/40 bg-brand-tint px-3 py-1.5 font-pretendard text-xs font-semibold text-brand hover:bg-brand hover:text-white dark:border-gold/50 dark:bg-zinc-800 dark:text-gold dark:hover:bg-gold dark:hover:text-[#0a192f]"
                    >
                      수정
                    </button>
                  </div>
                )}
              </div>

              {/* 4) 수업 스케줄 — 요일 박스 */}
              <section className="mt-6">
                <h3 className="mb-2 font-paperozi text-sm font-semibold text-brand dark:text-zinc-100">
                  수업 스케줄
                </h3>
                {detail.cls ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {WEEK.map((day) => {
                      const active = detail.cls!.days.includes(day)
                      return (
                        <div
                          key={day}
                          className={
                            'flex min-h-[72px] flex-col items-center rounded-xl border px-2 py-2.5 text-center ' +
                            (active
                              ? 'border-brand/30 bg-brand-tint dark:border-gold/40 dark:bg-zinc-800/80'
                              : 'border-cream-line bg-cream dark:border-zinc-800 dark:bg-zinc-900/40')
                          }
                        >
                          <span
                            className={
                              'font-paperozi text-sm font-bold ' +
                              (active
                                ? 'text-brand dark:text-gold'
                                : 'text-brand/30 dark:text-zinc-600')
                            }
                          >
                            {day}
                          </span>
                          {active ? (
                            <span className="mt-1.5 font-pretendard text-xs font-medium leading-tight text-brand/75 dark:text-zinc-300">
                              {detail.cls!.time}
                            </span>
                          ) : (
                            <span className="mt-1.5 font-pretendard text-xs text-brand/20 dark:text-zinc-700">
                              —
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-cream-line bg-cream px-4 py-6 text-center font-pretendard text-sm text-brand/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
                    배정된 반이 없습니다.
                  </p>
                )}
              </section>

              {/* 5) 시험 성적 */}
              <section className="mt-6">
                <h3 className="mb-2 font-paperozi text-sm font-semibold text-brand dark:text-zinc-100">
                  시험 성적
                </h3>
                {!detail.cls ? (
                  <p className="rounded-xl border border-cream-line bg-cream px-4 py-6 text-center font-pretendard text-sm text-brand/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
                    배정된 반이 없습니다.
                  </p>
                ) : detail.tests.length === 0 ? (
                  <p className="rounded-xl border border-cream-line bg-cream px-4 py-6 text-center font-pretendard text-sm text-brand/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
                    시험 기록이 없습니다.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-cream-line dark:border-zinc-800">
                    <table className="w-full min-w-[520px] text-left font-pretendard text-sm">
                      <thead className="border-b border-cream-line bg-cream text-xs uppercase text-brand/50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">날짜</th>
                          <th className="px-3 py-2 font-medium">구분</th>
                          <th className="px-3 py-2 font-medium">시험명</th>
                          <th className="px-3 py-2 font-medium text-right">점수</th>
                          <th className="px-3 py-2 font-medium text-right">비율</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-line dark:divide-zinc-800/70">
                        {detail.tests.map((t, i) => {
                          const ratio =
                            t.score !== null && t.fullScore > 0
                              ? Math.round((t.score / t.fullScore) * 100)
                              : null
                          return (
                            <tr key={i}>
                              <td className="px-3 py-2 text-brand/80 dark:text-zinc-200">{t.date}</td>
                              <td className="px-3 py-2">
                                <span className="rounded-full bg-brand/5 px-2 py-0.5 text-xs text-brand/70 dark:bg-zinc-800 dark:text-zinc-300">
                                  {t.kind}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-brand/80 dark:text-zinc-200">{t.title}</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {t.score === null ? (
                                  <span className="text-brand/30 dark:text-zinc-600">미응시</span>
                                ) : (
                                  <span className="font-semibold text-brand dark:text-zinc-100">
                                    {t.score}
                                    <span className="text-brand/40 dark:text-zinc-500"> / {t.fullScore}</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {ratio === null ? (
                                  <span className="text-brand/30 dark:text-zinc-600">—</span>
                                ) : (
                                  <span
                                    className="font-semibold"
                                    style={{ color: 'var(--accent)' }}
                                  >
                                    {ratio}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* 6) 최근 출결 현황 */}
              <section className="mt-6">
                <h3 className="mb-2 font-paperozi text-sm font-semibold text-brand dark:text-zinc-100">
                  최근 출결 현황
                </h3>
                {!detail.cls ? (
                  <p className="rounded-xl border border-cream-line bg-cream px-4 py-6 text-center font-pretendard text-sm text-brand/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
                    배정된 반이 없습니다.
                  </p>
                ) : detail.attendance.length === 0 ? (
                  <p className="rounded-xl border border-cream-line bg-cream px-4 py-6 text-center font-pretendard text-sm text-brand/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
                    출결 기록이 없습니다.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-cream-line dark:border-zinc-800">
                    <table className="w-full min-w-[480px] text-left font-pretendard text-sm">
                      <thead className="border-b border-cream-line bg-cream text-xs uppercase text-brand/50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">날짜</th>
                          <th className="px-3 py-2 font-medium">진도</th>
                          <th className="px-3 py-2 font-medium">담당강사</th>
                          <th className="px-3 py-2 font-medium">출석 상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-line dark:divide-zinc-800/70">
                        {detail.attendance.map((a, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-brand/80 dark:text-zinc-200">{a.date}</td>
                            <td className="px-3 py-2 text-brand/70 dark:text-zinc-300">
                              {a.progress ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-brand/70 dark:text-zinc-300">
                              {detail.cls!.teacher}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ' +
                                  ATT_BADGE[a.status]
                                }
                              >
                                ● {a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function ContactItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="font-pretendard text-xs font-medium text-brand/50 dark:text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 font-pretendard text-sm font-semibold text-brand dark:text-zinc-100">
        {value ?? '—'}
      </div>
    </div>
  )
}
