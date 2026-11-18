'use server'

import { authClient, appOrigin } from '@/lib/auth/server'
import { backendOrigin } from '../../../shared/deployment.mjs'
import { formText } from '@/lib/auth/validation'
import { cookies } from 'next/headers'
import { recoveryCookie } from '@/lib/auth/recovery'
import { beginEmailVerification } from '@/lib/auth/email-verification'
import { redirect } from 'next/navigation'

export type AccountActionState = { error?: string; message?: string; completed?: 'reset' | 'delete' | 'signout' }

export async function requestAccountRecovery(): Promise<AccountActionState> {
  const client = await authClient()
  if (!client) return { error: 'Account recovery is temporarily unavailable.' }
  const { data: { user } } = await client.auth.getUser()
  if (!user?.email_confirmed_at || !user.email) return { error: 'Sign in with a verified email to request recovery.' }
  try {
    const { error } = await client.auth.resetPasswordForEmail(user.email, { redirectTo: `${appOrigin()}/auth/callback?next=/reset-password` })
    if (error) {
      if (error.status === 429 || error.code === 'over_email_send_rate_limit') return { error: 'Too many recovery requests. Wait a few minutes before requesting another email. Check Spam for the latest code.' }
      return { error: 'The email service could not send your recovery code. Please try again later. Your password has not changed.' }
    }
  } catch { return { error: 'Could not reach the email service. Check your connection and try again. Your password has not changed.' } }
  try { await beginEmailVerification(user.email, 'recovery', user.id) }
  catch { return { error: 'Recovery verification is unavailable. Please try again later.' } }
  redirect('/verify-email')
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
