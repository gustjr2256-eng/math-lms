import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { LoginForm } from '@/components/auth/LoginForm'
import { SocialButtons } from '@/components/auth/SocialButtons'

export default function LoginPage() {
  return (
    <AuthCard title="로그인" subtitle="원장·강사 계정으로 로그인하세요">
      <div className="flex flex-col gap-5">
        <LoginForm />
        <SocialButtons />
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          아직 계정이 없으신가요?{' '}
          <Link href="/signup" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            가입 신청
          </Link>
        </p>
      </div>
    </AuthCard>
  )
}
