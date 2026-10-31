import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth/server'
import { AuthScreen } from '@/components/auth-screen'

export default async function ResetPasswordPage() {
  const client = await authClient()
  if (!client) redirect('/forgot-password')
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect('/forgot-password')
  return <AuthScreen mode="reset" configured />
}
