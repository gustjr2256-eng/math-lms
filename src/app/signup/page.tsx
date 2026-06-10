import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { SignupForm } from '@/components/auth/SignupForm'
import { SocialButtons } from '@/components/auth/SocialButtons'

export default function SignupPage() {
  return (
    <AuthCard title="가입 신청" subtitle="강사 계정을 신청합니다">
      <div className="flex flex-col gap-5">
        <SignupForm />
        <SocialButtons />
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            로그인
          </Link>
        </p>
      </div>
    </AuthCard>
  )
}
