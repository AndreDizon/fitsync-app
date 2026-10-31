import { AuthScreen } from '@/components/auth-screen'
import { headers } from 'next/headers'
import { testerEnabled } from '@/lib/auth/tester'

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const testerAvailable = testerEnabled((await headers()).get('host') ?? '')
  const notice = params.error ? 'That sign-in link is invalid or expired. Please try again.' : params.password === 'updated' ? 'Password updated. Sign in with your new password.' : undefined
  return <AuthScreen mode="login" configured={!!(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))} testerAvailable={testerAvailable} notice={notice} />
}
