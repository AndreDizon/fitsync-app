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
  const status = await client!.rpc('fitsync_has_password')
  const configured = !status.error && typeof status.data === 'boolean'
  return <AuthScreen mode="complete" configured={configured} verifiedEmail={user.email} passwordRequired={status.data !== true} initialUsername={typeof user.user_metadata.username === 'string' ? user.user_metadata.username : ''}/>
}
