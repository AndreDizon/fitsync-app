import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth/server'
import { needsAccountSetup } from '../../../shared/account-security'
import { AuthScreen } from '@/components/auth-screen'

export const dynamic = 'force-dynamic'
export default async function CompleteAccountPage() {
  const client = await authClient()
  const user = client ? (await client.auth.getUser()).data.user : null
  if (!user?.email_confirmed_at) redirect('/login?error=confirm')
  if (!needsAccountSetup(user)) redirect('/')
  return <AuthScreen mode="complete" configured verifiedEmail={user.email}/>
}
