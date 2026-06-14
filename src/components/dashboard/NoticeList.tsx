'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Announcement } from '@/lib/announcements'
import { useAnnouncement } from '@/components/announcements/AnnouncementProvider'

// 대시보드 우측 공지사항 목록 — 클릭하면 상세 모달.
//   목록: 제목 + 날짜(+특정반 배지). 모달: 제목/이미지/본문(서식).
export function NoticeList({ notices }: { notices: Announcement[] }) {
  const [selected, setSelected] = useState<Announcement | null>(null)
  // 메인 자동 팝업과 동시에 뜨면 깜빡이므로, 목록에서 공지를 열 때 자동 팝업을 먼저 닫는다.
  const { close } = useAnnouncement()

  const open = (n: Announcement) => {
    close()
    setSelected(n)
  }

  return (
    <>
    <section className="app-card app-card-hover p-5">
      <h2 className="mb-3 flex items-center gap-2 font-paperozi text-base font-semibold text-brand dark:text-zinc-50">
        <span>📢</span> 공지사항
      </h2>

      {notices.length === 0 ? (
        <p className="px-1 py-8 text-center font-pretendard text-sm text-brand/40 dark:text-zinc-500">
          등록된 공지가 없습니다.
        </p>
      ) : (
        <ul className="-mx-2 divide-y divide-cream-line dark:divide-zinc-800/70">
          {notices.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-brand-tint dark:hover:bg-zinc-800/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {n.target === 'class' && (
                      <span className="shrink-0 rounded-full bg-brand/10 px-1.5 py-0.5 font-pretendard text-[10px] font-medium text-brand dark:bg-zinc-800 dark:text-zinc-300">
                        반
                      </span>
                    )}
                    <span className="truncate font-pretendard text-sm font-semibold text-brand dark:text-zinc-100">
                      {n.title}
                    </span>
                  </div>
                  <span className="mt-0.5 block font-pretendard text-xs text-brand/45 dark:text-zinc-400">
                    {formatDate(n.created_at)}
                  </span>
                </div>
                <span className="mt-0.5 shrink-0 font-pretendard text-xs text-brand/30 dark:text-zinc-600">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

    </section>

    {/* 상세 모달 — app-card-hover(transform) 바깥에 두어 fixed 가 viewport 정중앙으로 잡히게 한다 */}
    <AnimatePresence>
      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelected(null)}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-cream-card shadow-2xl ring-1 ring-cream-line dark:bg-zinc-950 dark:ring-zinc-800"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="닫기"
              className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-black/5 text-brand/60 backdrop-blur transition-colors hover:bg-brand-tint hover:text-brand dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              ✕
            </button>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {selected.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.image_url} alt="" className="max-h-[26rem] w-full object-cover" />
              )}

              <div className="px-9 py-8">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 font-paperozi text-xs font-bold tracking-wide text-brand dark:bg-zinc-800 dark:text-gold">
                  <span>📢</span> {selected.target === 'class' ? '특정 반 공지' : '학원 공지'}
                </span>
                <h2 className="mt-3 font-paperozi text-3xl font-bold text-brand dark:text-zinc-50">
                  {selected.title}
                </h2>
                <p className="mt-1.5 font-pretendard text-sm text-brand/45 dark:text-zinc-400">
                  {formatDate(selected.created_at)}
                </p>
                {selected.body_html ? (
                  <div
                    className="mt-5 font-pretendard text-base leading-relaxed text-brand/80 dark:text-zinc-300 [&_h3]:mt-3 [&_h3]:font-paperozi [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-brand dark:[&_h3]:text-zinc-100 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: selected.body_html }}
                  />
                ) : (
                  <p className="mt-5 whitespace-pre-wrap font-pretendard text-base leading-relaxed text-brand/80 dark:text-zinc-300">
                    {selected.body}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 justify-end border-t border-cream-line px-7 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-11 rounded-xl bg-brand px-7 font-pretendard text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-strong dark:bg-gold dark:text-[#0a192f] dark:hover:bg-gold-strong"
              >
                확인했습니다
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  )
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}
