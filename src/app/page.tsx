import { redirect } from 'next/navigation'

// 진입점: proxy가 인증/승인 상태를 판정하므로 여기서는 대시보드로 보낸다.
// (미인증/미승인은 proxy가 /login · /pending 으로 다시 보낸다.)
export default function Home() {
  redirect('/dashboard')
}
