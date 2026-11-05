import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth/server'
import Dashboard from '@/components/dashboard'
import { currentTester } from '@/lib/auth/tester'
import { testerOnboarding } from '@/lib/auth/onboarding'
import { readCompletedOnboarding } from '../../shared/onboarding'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  if (await currentTester()) {
    const profile = await testerOnboarding()
    if (!profile) redirect('/onboarding')
    return <Dashboard userName="Test Admin" userEmail={process.env.DEV_TEST_ADMIN_EMAIL!} profile={profile} />
  }
  const client = await authClient()
  if (!client) redirect('/login')
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect('/login')
  const profile = readCompletedOnboarding(user.user_metadata.fitsync_onboarding)
  if (!profile) redirect('/onboarding')
  return <Dashboard userName={String(user.user_metadata.display_name || user.user_metadata.full_name || 'You')} userEmail={user.email ?? ''} profile={profile} />
}
