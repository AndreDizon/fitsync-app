'use server'

import { revalidatePath } from 'next/cache'
import { authClient } from '@/lib/auth/server'
import { currentTester, saveTesterUsername } from '@/lib/auth/tester'
import { validUsername } from '../../../shared/account-security'

export async function updateAccountUsername(value: string): Promise<{ username?: string; error?: string }> {
  if (typeof value !== 'string' || !validUsername(value.trim())) return { error: 'Use 3–30 letters, numbers, periods, underscores or hyphens. Start with a letter or number.' }
  const username = value.trim()
  try {
    if (await currentTester()) {
      await saveTesterUsername(username)
    } else {
      const client = await authClient()
      if (!client) return { error: 'Account updates are temporarily unavailable.' }
      const { data: { user }, error: sessionError } = await client.auth.getUser()
      if (sessionError || !user?.email_confirmed_at) return { error: 'Sign in with your verified account before editing your username.' }
      // No user ID, email, password or onboarding fields are accepted from the form.
      const { error } = await client.auth.updateUser({ data: { username, display_name: username } })
      if (error) return { error: 'Could not save your username. Please try again.' }
    }
    revalidatePath('/', 'layout')
    return { username }
  } catch { return { error: 'Could not save your username. Check your connection and try again.' } }
}
