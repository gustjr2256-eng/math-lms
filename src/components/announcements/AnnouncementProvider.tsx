'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getActiveAnnouncement } from '@/app/actions/announcements'
import { dismissForToday, isDismissedToday, type Announcement } from '@/lib/announcements'

type Ctx = {
  announcement: Announcement | null
  hasAnnouncement: boolean // 헤더 종 빨간 점 표시 여부
  isOpen: boolean
  openAuto: () => void // 메인 진입 자동 호출(오늘 숨김이면 안 뜸) — 대시보드에서만 트리거
  openForce: () => void // 종 클릭 — '오늘 보지 않기' 무시하고 강제 호출(어느 페이지든)
  close: () => void // 단순 닫기(이번만)
  dismissToday: () => void // 오늘 더 이상 보지 않기
}

const AnnouncementCtx = createContext<Ctx>({
  announcement: null,
  hasAnnouncement: false,
  isOpen: false,
  openAuto: () => {},
  openForce: () => {},
  close: () => {},
  dismissToday: () => {},
})

// 활성 공지를 불러와 팝업/종 버튼이 공유하는 상태를 제공한다.
export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // 활성 공지 로드(자동 팝업 여부는 여기서 결정하지 않는다)
  useEffect(() => {
    let alive = true
    getActiveAnnouncement().then((a) => {
      if (alive) setAnnouncement(a)
    })
    return () => {
      alive = false
    }
  }, [])

  // 메인(대시보드)에서만 호출되는 자동 오픈 — 오늘 숨김이 아니면 팝업
  const openAuto = useCallback(() => {
    if (announcement && !isDismissedToday(announcement.id)) setIsOpen(true)
  }, [announcement])

  const openForce = useCallback(() => {
    if (announcement) setIsOpen(true)
  }, [announcement])

  const close = useCallback(() => setIsOpen(false), [])

  const dismissToday = useCallback(() => {
    if (announcement) dismissForToday(announcement.id)
    setIsOpen(false)
  }, [announcement])

  return (
    <AnnouncementCtx.Provider
      value={{
        announcement,
        hasAnnouncement: !!announcement,
        isOpen,
        openAuto,
        openForce,
        close,
        dismissToday,
      }}
    >
      {children}
    </AnnouncementCtx.Provider>
  )
}

export const useAnnouncement = () => useContext(AnnouncementCtx)
