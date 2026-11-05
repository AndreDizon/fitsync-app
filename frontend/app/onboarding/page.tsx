import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth/server'
import { currentTester } from '@/lib/auth/tester'
import { testerOnboarding } from '@/lib/auth/onboarding'
import { readCompletedOnboarding } from '../../../shared/onboarding'
import { Onboarding } from '@/components/onboarding'
import './onboarding.css'

export const dynamic = 'force-dynamic'
export default async function OnboardingPage() {
  if (await currentTester()) return <Onboarding name="Test" profile={await testerOnboarding()} />
  const client = await authClient()
  const user = client ? (await client.auth.getUser()).data.user : null
  if (!user) redirect('/login')
  return <Onboarding name={String(user.user_metadata.display_name || user.user_metadata.full_name || 'friend').split(/\s+/)[0]} profile={readCompletedOnboarding(user.user_metadata.fitsync_onboarding)} />
}
