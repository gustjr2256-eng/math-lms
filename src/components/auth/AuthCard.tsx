// 인증 화면 공통 카드 레이아웃.
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-6 flex flex-col gap-1 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            수학학원 LMS
          </span>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
