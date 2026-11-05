'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authClient } from '@/lib/auth/server'
import { currentTester } from '@/lib/auth/tester'
import { saveTesterOnboarding } from '@/lib/auth/onboarding'
import { parseOnboarding, validateOnboarding, type Goal, type OnboardingProfile } from '../../../shared/onboarding'

export type OnboardingState = { error?: string }
export async function saveOnboarding(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  const tester = await currentTester()
  const client = tester ? null : await authClient()
  const user = client ? (await client.auth.getUser()).data.user : null
  if (!tester && !user) return { error: 'Your session has expired. Sign in again before saving.' }
  const raw = form.get('profile')
  if (typeof raw !== 'string' || raw.length > 6000) return { error: 'These preferences could not be read. Please try again.' }
  let value: unknown
  try { value = JSON.parse(raw) } catch { return { error: 'These preferences could not be read. Please try again.' } }
  const draft = parseOnboarding(value)
  if (!draft) return { error: 'Check your preferences and try again.' }
  const errors = validateOnboarding(draft)
  if (errors.length) return { error: errors.join(' ') }
  const profile: OnboardingProfile = { ...draft, goal: draft.goal as Goal, version: 2, completedAt: new Date().toISOString() }
  try {
    if (tester) await saveTesterOnboarding(profile)
    else {
      const { error } = await client!.auth.updateUser({ data: { fitsync_onboarding: profile } })
      if (error) return { error: 'Your preferences could not be saved. Check your connection and retry.' }
    }
  } catch { return { error: 'Your preferences could not be saved. Please try again.' } }
  revalidatePath('/', 'layout')
  redirect('/plan-preparation')
}
