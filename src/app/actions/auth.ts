'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string } | undefined

const signupSchema = z.object({
  name: z.string().trim().min(2, { message: '이름은 2자 이상이어야 합니다.' }),
  email: z.string().trim().email({ message: '올바른 이메일을 입력하세요.' }),
  password: z
    .string()
    .min(8, { message: '비밀번호는 8자 이상이어야 합니다.' }),
})

const loginSchema = z.object({
  email: z.string().trim().email({ message: '올바른 이메일을 입력하세요.' }),
  password: z.string().min(1, { message: '비밀번호를 입력하세요.' }),
})

// 회원가입 — 트리거가 teacher/pending 유저를 생성한다.
export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
    },
  })
  if (error) {
    return { error: error.message }
  }

  redirect('/pending')
}

// 로그인 — 승인 상태에 따라 분기.
export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('status')
    .eq('id', data.user.id)
    .single()

  if (profile?.status === 'suspended') {
    await supabase.auth.signOut()
    return { error: '정지된 계정입니다. 원장에게 문의하세요.' }
  }

  if (profile?.status !== 'approved') {
    redirect('/pending')
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// 구글 OAuth — 콜백 라우트로 코드 교환을 위임한다.
export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? ''

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })
  if (error) {
    redirect('/login?error=oauth')
  }
  if (data.url) {
    redirect(data.url)
  }
}
