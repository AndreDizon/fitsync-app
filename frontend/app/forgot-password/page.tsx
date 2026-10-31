import { AuthScreen } from '@/components/auth-screen'

export default function ForgotPasswordPage() {
  return <AuthScreen mode="forgot" configured={!!(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))} />
}
