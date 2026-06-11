'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 원장(admin) 전용 페이지 클라이언트 가드.
//  서버 측 1차 보안은 proxy(/admin/* 차단) + 각 페이지 requireAdmin 이 담당하고,
//  이 컴포넌트는 요구된 클라이언트 권한 분기(권한 없으면 alert 후 메인으로 이동)를 더한다.
//  (role !== 'admin'(=OWNER) 이면 경고 후 '/'로 navigate)
export function AdminGuard({
  isAdmin,
  children,
}: {
  isAdmin: boolean
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    if (!isAdmin) {
      alert('권한이 없습니다.')
      router.replace('/')
    }
  }, [isAdmin, router])

  // 권한 없으면 내용 노출 방지
  if (!isAdmin) return null

  return <>{children}</>
}
