'use client'

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

type ThemeCtx = {
  theme: Theme
  toggle: () => void
  mounted: boolean
}

const Ctx = createContext<ThemeCtx>({ theme: 'light', toggle: () => {}, mounted: false })

// 외부 store(=<html>.dark 클래스)를 구독한다.
// 토글/다른 탭(storage 이벤트) 변경 시 'themechange' 로 알린다.
function subscribe(callback: () => void) {
  window.addEventListener('themechange', callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener('themechange', callback)
    window.removeEventListener('storage', callback)
  }
}
function getSnapshot(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}
function getServerSnapshot(): Theme {
  return 'light'
}

// 다크모드 상태 관리.
//  - 첫 페인트 전 적용/FOUC 방지는 layout.tsx 인라인 스크립트가 담당(<html>.dark 부여).
//  - useSyncExternalStore 로 그 DOM 상태를 구독 → effect 없이 안전하게 동기화.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* private mode 등 — 무시 */
    }
    window.dispatchEvent(new Event('themechange'))
  }, [])

  return <Ctx.Provider value={{ theme, toggle, mounted: true }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
