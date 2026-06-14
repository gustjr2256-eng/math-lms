'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { logout } from '@/app/actions/auth'

// 유휴 자동 로그아웃.
//  - IDLE_LIMIT_MS 동안 활동(마우스/키보드/스크롤/터치)이 없으면 자동 로그아웃.
//  - 만료 WARN_BEFORE_MS 전에 경고 모달을 띄워 갑작스러운 로그아웃을 방지.
//  - 경고가 떠 있는 동안의 활동은 무시하고, 명시적으로 [계속 이용하기]를 눌러야
//    연장된다(자리를 비운 사이 마우스가 흔들려 무한 연기되는 것을 막기 위함).
//  - AppShell 내부(로그인 영역)에만 렌더된다.
const IDLE_LIMIT_MS = 30 * 60 * 1000 // 무활동 허용 한도(30분)
const WARN_BEFORE_MS = 60 * 1000 // 만료 1분 전 경고
const MOUSEMOVE_THROTTLE_MS = 1000 // mousemove 리셋 쓰로틀

// 경고 진입까지의 대기(= 한도 - 경고시간)
const IDLE_UNTIL_WARN_MS = IDLE_LIMIT_MS - WARN_BEFORE_MS
const COUNTDOWN_SECONDS = Math.floor(WARN_BEFORE_MS / 1000)

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function IdleLogout() {
  const [warning, setWarning] = useState(false)
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS)

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMove = useRef(0)
  const warningRef = useRef(false) // 경고 단계 여부(이벤트 콜백에서 즉시 참조)

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (countdown.current) clearInterval(countdown.current)
    idleTimer.current = null
    countdown.current = null
  }, [])

  const doLogout = useCallback(() => {
    clearTimers()
    warningRef.current = false
    void logout() // 서버 액션: signOut + redirect('/login')
  }, [clearTimers])

  // 경고 단계 진입: 모달 표시 + 카운트다운(deadline 기준)
  const enterWarning = useCallback(() => {
    warningRef.current = true
    const deadline = Date.now() + WARN_BEFORE_MS
    setRemaining(COUNTDOWN_SECONDS)
    setWarning(true)
    countdown.current = setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000)
      if (left <= 0) {
        doLogout()
        return
      }
      setRemaining(left)
    }, 250)
  }, [doLogout])

  // idle 타이머 시작/재시작(경고 진입까지 카운트)
  const startIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(enterWarning, IDLE_UNTIL_WARN_MS)
  }, [enterWarning])

  // 활동 감지 — 경고 중이면 무시(명시적 연장만 허용)
  const onActivity = useCallback(() => {
    if (warningRef.current) return
    startIdle()
  }, [startIdle])

  // [계속 이용하기]
  const extend = useCallback(() => {
    warningRef.current = false
    if (countdown.current) {
      clearInterval(countdown.current)
      countdown.current = null
    }
    setWarning(false)
    startIdle()
  }, [startIdle])

  useEffect(() => {
    const handleMouseMove = () => {
      const now = Date.now()
      if (now - lastMove.current < MOUSEMOVE_THROTTLE_MS) return
      lastMove.current = now
      onActivity()
    }
    const handle = () => onActivity()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('keydown', handle)
    window.addEventListener('click', handle)
    window.addEventListener('scroll', handle, { passive: true })
    window.addEventListener('touchstart', handle, { passive: true })

    startIdle()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keydown', handle)
      window.removeEventListener('click', handle)
      window.removeEventListener('scroll', handle)
      window.removeEventListener('touchstart', handle)
      clearTimers()
    }
  }, [onActivity, startIdle, clearTimers])

  return (
    <AnimatePresence>
      {warning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-2 bg-brand px-6 py-4 text-white dark:bg-gold dark:text-[#0a192f]">
              <span className="text-lg">⏱️</span>
              <span className="font-paperozi text-sm font-bold tracking-wide">
                자동 로그아웃 안내
              </span>
            </div>

            <div className="px-7 py-6 text-center">
              <p className="font-pretendard text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                장시간 활동이 없어 곧 자동으로 로그아웃됩니다.
              </p>
              <div className="mt-4 font-paperozi text-4xl font-bold tabular-nums text-brand dark:text-gold">
                {formatTime(remaining)}
              </div>
              <p className="mt-2 font-pretendard text-xs text-zinc-400">
                계속 이용하시려면 아래 버튼을 눌러 주세요.
              </p>
            </div>

            <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={extend}
                className="h-11 w-full rounded-xl bg-brand px-7 font-pretendard text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-strong dark:bg-gold dark:text-[#0a192f] dark:hover:bg-gold-strong"
              >
                계속 이용하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
