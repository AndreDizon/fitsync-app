import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth/server'
import { hasRecovery } from '@/lib/auth/recovery'
import { SignupConfirmed } from '@/components/signup-confirmation'

export default async function RecoveredPage() {
  const client = await authClient()
  const user = client ? (await client.auth.getUser()).data.user : null
  const session = client ? (await client.auth.getSession()).data.session : null
  if (!user?.email_confirmed_at || !session || !await hasRecovery(user.id, session.access_token)) redirect('/forgot-password?error=link')
  return <SignupConfirmed kind="recovery" />
}
