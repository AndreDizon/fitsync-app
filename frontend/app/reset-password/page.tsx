import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth/server'
import { hasRecovery } from '@/lib/auth/recovery'
import { AuthScreen } from '@/components/auth-screen'

export default async function ResetPasswordPage() {
  const client = await authClient()
  if (!client) redirect('/forgot-password')
  const { data: { user } } = await client.auth.getUser()
  const { data: { session } } = await client.auth.getSession()
  if (!user || !session || !await hasRecovery(user.id, session.access_token)) redirect('/forgot-password?error=link')
  return <AuthScreen mode="reset" configured />
}
