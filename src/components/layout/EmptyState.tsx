import type { ReactNode } from 'react'

// 메인 콘텐츠 빈 화면 컨테이너.
// 데이터/차트가 아직 없을 때 페이지 본문에 놓는 자리표시 레이아웃.
export function EmptyState({
  icon = '📊',
  title = '표시할 내용이 없습니다',
  description,
  action,
}: {
  icon?: ReactNode
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center app-card px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint text-2xl dark:bg-zinc-800">
        {icon}
      </div>
      <h3 className="mt-4 font-heading text-lg font-semibold text-brand dark:text-zinc-100">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-brand/60 dark:text-zinc-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
