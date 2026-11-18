'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authClient, appOrigin } from '@/lib/auth/server'
import { testerLogin, testerCookie } from '@/lib/auth/tester'
import { cookies } from 'next/headers'
import { needsAccountSetup, validUsername } from '../../../shared/account-security'
import { readRecovery, recoveryCookie } from '@/lib/auth/recovery'
import { emailFrom, formText, validEmail, newPasswordErrors, type FieldErrors } from '@/lib/auth/validation'

export type AuthState = { error?: string; message?: string; fieldErrors?: FieldErrors }
const unavailable = { error: 'Sign-in is temporarily unavailable. Please try again later.' }

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = emailFrom(form)
  const password = formText(form, 'password')
  if (!email || email.length > 254 || !password || password.length > 128) return { error: 'Enter your sign-in details.' }
  if (await testerLogin(email, password)) { revalidatePath('/', 'layout'); redirect('/') }
  if (!validEmail(email)) return { error: 'Unable to sign in. Check your sign-in details.' }
  const client = await authClient()
  if (!client) return unavailable
  try {
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) return { error: 'Unable to sign in. Check your details and confirm your email, or reset your password.' }
  } catch { return unavailable }
  ;(await cookies()).delete(testerCookie)
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const email = emailFrom(form)
  const password = formText(form, 'password')
  const name = formText(form, 'name').trim()
  const fieldErrors: FieldErrors = { ...newPasswordErrors(password, formText(form, 'confirmPassword')) }
  if (!validEmail(email)) fieldErrors.email = 'Enter a valid email address.'
  if (!validUsername(name)) fieldErrors.name = 'Use 3-30 letters, numbers, periods, underscores or hyphens. Start with a letter or number.'
  if (Object.keys(fieldErrors).length) return { error: 'Check the highlighted fields.', fieldErrors }
  const client = await authClient()
  if (!client) return unavailable
  let session = false
  try {
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { username: name, display_name: name }, emailRedirectTo: `${appOrigin()}/auth/callback` } })
    if (error) return { error: 'Unable to create an account. Try again later, or sign in if you already have an account.' }
    session = !!data.session
  } catch { return unavailable }
  if (session) { (await cookies()).delete(testerCookie); revalidatePath('/', 'layout'); redirect('/') }
  return { message: 'Check your inbox to confirm your email. If you already have an account, you can sign in or reset your password.' }
}

export async function googleSignIn(_: AuthState): Promise<AuthState> {
  const client = await authClient()
  if (!client) return unavailable
  let destination: string | undefined
  try {
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${appOrigin()}/auth/callback`, scopes: 'openid email profile', queryParams: { prompt: 'select_account' } } })
    if (error || !data.url) return { error: 'Google sign-in is unavailable. Please try again later.' }
    destination = data.url
  } catch { return { error: 'Google sign-in is unavailable. Please try again later.' } }
  ;(await cookies()).delete(testerCookie)
  redirect(destination)
}

export async function forgotPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const email = emailFrom(form)
  if (!validEmail(email)) return { error: 'Enter a valid email address.', fieldErrors: { email: 'Enter a valid email address.' } }
  const client = await authClient()
  if (!client) return unavailable
  try { await client.auth.resetPasswordForEmail(email, { redirectTo: `${appOrigin()}/auth/callback?next=/reset-password` }) }
  catch { /* Keep the response identical for registered and unregistered addresses. */ }
  return { message: 'If an account matches that email, a password reset link will arrive shortly.' }
}

export async function resetPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = formText(form, 'password')
  const fieldErrors = newPasswordErrors(password, formText(form, 'confirmPassword'))
  if (Object.keys(fieldErrors).length) return { error: 'Check the highlighted fields.', fieldErrors }
  const client = await authClient()
  if (!client) return unavailable
  try {
    const { data: { user } } = await client.auth.getUser()
    const { data: { session } } = await client.auth.getSession()
    const grant = user && session ? await readRecovery(user.id, session.access_token) : null
    if (!grant) return { error: 'This reset link has expired. Request a new one.' }
    const consumed = await client.rpc('consume_fitsync_recovery', { grant_id: grant.id, valid_until: new Date(grant.expires).toISOString() })
    if (consumed.error || consumed.data !== true) return { error: 'This recovery link is no longer available. Request a new one.' }
    const { error } = await client.auth.updateUser({ password })
    if (error) return { error: 'Unable to update your password. Try a different password or request a new link.' }
    ;(await cookies()).delete(recoveryCookie)
    const signedOut = await client.auth.signOut({ scope: 'global' })
    if (signedOut.error) return { error: 'Your password changed, but other sessions could not be signed out. Sign in with your new password and use Sign out everywhere in Settings.' }
  } catch { return { error: 'Unable to update your password right now. Request a new link and try again.' } }
  ;(await cookies()).delete(testerCookie)
  revalidatePath('/', 'layout')
  redirect('/login?password=updated')
}

export async function signOut() {
  ;(await cookies()).delete(testerCookie)
  const client = await authClient()
  ;(await cookies()).delete(recoveryCookie)
  ;(await cookies()).delete('fitsync-tester-preferences')
  if (client) {
    const { error } = await client.auth.signOut({ scope: 'local' })
    if (error) throw new Error('Could not sign out. Please try again.')
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function completeAccount(_: AuthState, form: FormData): Promise<AuthState> {
  const username = formText(form, 'name').trim()
  const password = formText(form, 'password')
  const fieldErrors = newPasswordErrors(password, formText(form, 'confirmPassword'))
  if (!validUsername(username)) fieldErrors.name = 'Use 3-30 letters, numbers, periods, underscores or hyphens. Start with a letter or number.'
  if (Object.keys(fieldErrors).length) return { error: 'Check the highlighted fields.', fieldErrors }
  const client = await authClient()
  if (!client) return unavailable
  try {
    const { data: { user } } = await client.auth.getUser()
    if (!user?.email_confirmed_at) return { error: 'Sign in with a verified email to complete your account.' }
    if (!needsAccountSetup(user)) return { error: 'Your account is already complete. Use password recovery in Settings to change your password.' }
    const updated = await client.auth.updateUser({ password })
    if (updated.error) return { error: 'Could not set your FitSync password. Choose a different password or request a recovery link.' }
    const completed = await client.rpc('complete_fitsync_registration', { chosen_username: username })
    if (completed.error) return { error: 'Account setup is temporarily unavailable. Please try again later.' }
    await client.auth.refreshSession()
  } catch { return unavailable }
  revalidatePath('/', 'layout')
  redirect('/')
}
