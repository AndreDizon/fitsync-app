import { redirect } from 'next/navigation'
import { authClient } from '@/lib/auth/server'
import { currentTester } from '@/lib/auth/tester'
import { testerOnboarding } from '@/lib/auth/onboarding'
import { readCompletedOnboarding } from '../../../shared/onboarding'
import { PlanPreparation } from '@/components/plan-preparation'
import './preparation.css'

export const dynamic = 'force-dynamic'
export default async function PlanPreparationPage() {
  if (await currentTester()) {
    const profile = await testerOnboarding()
    if (!profile) redirect('/onboarding')
    return <PlanPreparation profile={profile} />
  }
  const client = await authClient()
  const user = client ? (await client.auth.getUser()).data.user : null
  if (!user) redirect('/login')
  const profile = readCompletedOnboarding(user.user_metadata.fitsync_onboarding)
  if (!profile) redirect('/onboarding')
  return <PlanPreparation profile={profile} />
}
