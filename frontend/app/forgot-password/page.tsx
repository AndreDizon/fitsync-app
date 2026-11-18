import { AuthScreen } from '@/components/auth-screen'

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  return <AuthScreen mode="forgot" notice={params.error === 'link' ? 'That recovery link is invalid, expired or already used. Request a new link below.' : undefined} configured={!!(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))} />
}
