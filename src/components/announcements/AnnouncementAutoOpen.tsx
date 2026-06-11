'use client'

import { useEffect } from 'react'
import { useAnnouncement } from './AnnouncementProvider'

// 메인(대시보드)에만 배치해 진입 시 공지 팝업을 자동 호출한다.
// 다른 페이지에는 이 컴포넌트를 두지 않으므로 자동 팝업이 뜨지 않는다.
export function AnnouncementAutoOpen() {
  const { openAuto } = useAnnouncement()
  useEffect(() => {
    openAuto()
  }, [openAuto])
  return null
}
