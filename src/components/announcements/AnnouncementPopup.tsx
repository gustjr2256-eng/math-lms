'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useAnnouncement } from './AnnouncementProvider'

// 메인 진입 시 자동으로 뜨는 공지 팝업.
//  - X / 오버레이: 이번만 닫기
//  - 하단 버튼: 오늘 더 이상 보지 않기(localStorage)
export function AnnouncementPopup() {
  const { announcement, isOpen, close, dismissToday } = useAnnouncement()

  return (
    <AnimatePresence>
      {isOpen && announcement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
          >
            {/* 브랜드 헤더 바 — 강한 대비로 눈에 띄게 */}
            <div className="flex items-center justify-between bg-brand px-6 py-4 text-white dark:bg-gold dark:text-[#0a192f]">
              <span className="flex items-center gap-2 font-paperozi text-sm font-bold tracking-wide">
                <span className="text-lg">📢</span> 학원 공지
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                ✕
              </button>
            </div>

            {announcement.image_url && (
              // 외부 공개 버킷 URL — next/image 대신 일반 img
              // eslint-disable-next-line @next/next/no-img-element
              <img src={announcement.image_url} alt="" className="max-h-80 w-full object-cover" />
            )}

            <div className="px-7 py-6">
              {announcement.target === 'class' && (
                <span className="mb-2 inline-block rounded-full bg-brand/10 px-2.5 py-0.5 font-pretendard text-[11px] font-medium text-brand dark:bg-zinc-800 dark:text-zinc-300">
                  특정 반 공지
                </span>
              )}
              <h2 className="font-paperozi text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {announcement.title}
              </h2>
              {announcement.body_html ? (
                // body_html 은 createAnnouncement 에서 sanitize 된 신뢰 콘텐츠(원장 작성)
                <div
                  className="mt-4 font-pretendard text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300 [&_h3]:mt-3 [&_h3]:font-paperozi [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-zinc-900 dark:[&_h3]:text-zinc-100 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: announcement.body_html }}
                />
              ) : (
                <p className="mt-4 whitespace-pre-wrap font-pretendard text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {announcement.body}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={dismissToday}
                className="font-pretendard text-xs text-zinc-400 hover:text-zinc-600 hover:underline dark:hover:text-zinc-300"
              >
                오늘 더 이상 보지 않기
              </button>
              <button
                type="button"
                onClick={close}
                className="h-11 rounded-xl bg-brand px-7 font-pretendard text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-strong dark:bg-gold dark:text-[#0a192f] dark:hover:bg-gold-strong"
              >
                확인했습니다
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
