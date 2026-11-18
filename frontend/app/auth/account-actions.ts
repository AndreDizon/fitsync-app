'use server'

import { authClient, appOrigin } from '@/lib/auth/server'
import { backendOrigin } from '../../../shared/deployment.mjs'
import { formText } from '@/lib/auth/validation'
import { cookies } from 'next/headers'
import { recoveryCookie } from '@/lib/auth/recovery'

export type AccountActionState = { error?: string; message?: string; completed?: 'reset' | 'delete' | 'signout' }

export async function requestAccountRecovery(): Promise<AccountActionState> {
  const client = await authClient()
  if (!client) return { error: 'Account recovery is temporarily unavailable.' }
  const { data: { user } } = await client.auth.getUser()
  if (!user?.email_confirmed_at || !user.email) return { error: 'Sign in with a verified email to request recovery.' }
  try { await client.auth.resetPasswordForEmail(user.email, { redirectTo: `${appOrigin()}/auth/callback?next=/reset-password` }) } catch { /* Same response regardless of delivery outcome. */ }
  return { message: 'If email recovery is available for your account, a single-use link will arrive in your inbox. Check your spam folder too. Open it to choose a new FitSync password.' }
}

export async function eraseAccountData(_: AccountActionState, form: FormData): Promise<AccountActionState> {
  const operation = formText(form, 'operation')
  if (operation !== 'reset' && operation !== 'delete') return { error: 'Choose an account action.' }
  const client = await authClient()
  if (!client) return { error: 'Account service is unavailable.' }
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'Your session has expired. Sign in again.' }
  const { data: { session } } = await client.auth.getSession()
  if (!session) return { error: 'Your session has expired. Sign in again.' }
  try {
    const response = await fetch(`${backendOrigin()}/api/account`, { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, password: formText(form, 'password'), confirmation: formText(form, 'confirmation') }), signal: AbortSignal.timeout(60000) })
    const result = await response.json()
    if (!response.ok) return { error: result.error || 'Could not finish. Please retry.' }
    if (operation === 'delete') { (await cookies()).delete(recoveryCookie); await client.auth.signOut({ scope: 'local' }) }
    return { completed: operation }
  } catch { return { error: 'The connection was interrupted. The operation may have partially completed. Check your account before trying again.' } }
}

/** Called only after the client has removed private device copies. */
export async function finishAccountReset(): Promise<void> {
  const client = await authClient()
  if (!client) throw new Error('Account service is unavailable.')
  const { error } = await client.auth.refreshSession()
  if (error) throw new Error('Sign in again to continue.')
}

export async function signOutEverywhere(): Promise<AccountActionState> {
  const client = await authClient()
  if (!client) return { error: 'Sign-out is temporarily unavailable.' }
  const { error } = await client.auth.signOut({ scope: 'global' })
  if (error) return { error: 'Could not sign out all sessions. Try again.' }
  ;(await cookies()).delete(recoveryCookie)
  return { completed: 'signout' }
}
