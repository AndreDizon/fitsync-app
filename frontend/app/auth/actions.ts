'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authClient, appOrigin } from '@/lib/auth/server'
import { testerLogin, testerCookie } from '@/lib/auth/tester'
import { cookies } from 'next/headers'
import { needsAccountSetup, validUsername } from '../../../shared/account-security'
import { grantRecovery, readRecovery, recoveryCookie } from '@/lib/auth/recovery'
import { beginEmailVerification, readEmailVerification, verificationCookie } from '@/lib/auth/email-verification'
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
  try { await beginEmailVerification(email, 'signup') } catch { return unavailable }
  redirect('/verify-email')
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
  try { await beginEmailVerification(email, 'recovery') } catch { return unavailable }
  redirect('/verify-email')
}

export async function verifyEmailCode(_: AuthState, form: FormData): Promise<AuthState> {
  const pending = await readEmailVerification()
  if (!pending) return { error: 'This verification request expired. Go back and request a new code.' }
  const token = formText(form, 'code').trim()
  if (!/^\d{6,10}$/.test(token)) return { error: 'Enter the complete numeric code from your email.', fieldErrors: { code: 'Use the 6-10 digit code shown in your email.' } }
  const client = await authClient()
  if (!client) return unavailable
  try {
    if (pending.owner) {
      const current = (await client.auth.getUser()).data.user
      if (current?.id !== pending.owner) return { error: 'Your signed-in account changed. Request recovery again from Settings.' }
    }
    const { data, error } = await client.auth.verifyOtp({ email: pending.email, token, type: pending.kind === 'recovery' ? 'recovery' : 'email' })
    if (error || !data.session || !data.user?.email_confirmed_at || data.user.email?.toLowerCase() !== pending.email.toLowerCase() || (pending.owner && data.user.id !== pending.owner)) {
      return { error: error?.status === 429 ? 'Too many attempts. Wait a few minutes before trying again.' : 'That code is invalid, expired or already used. Check the latest email or request a new code.' }
    }
    if (pending.kind === 'recovery') await grantRecovery(data.user.id, data.session.access_token)
    ;(await cookies()).delete(verificationCookie)
    ;(await cookies()).delete(testerCookie)
  } catch { return { error: 'Could not verify your code. Please try again or request a new code.' } }
  revalidatePath('/', 'layout')
  redirect(pending.kind === 'recovery' ? '/reset-password' : '/')
}

export async function resendEmailCode(_: AuthState): Promise<AuthState> {
  const pending = await readEmailVerification()
  if (!pending) return { error: 'This verification request expired. Go back and request a new code.' }
  const client = await authClient()
  if (!client) return unavailable
  // Anonymous resend responses stay identical for existing and unknown accounts.
  try {
    if (pending.owner && (await client.auth.getUser()).data.user?.id !== pending.owner) return { error: 'Your signed-in account changed. Request recovery again from Settings.' }
    if (pending.kind === 'signup') await client.auth.resend({ type: 'signup', email: pending.email })
    else await client.auth.resetPasswordForEmail(pending.email, { redirectTo: `${appOrigin()}/auth/callback?next=/reset-password` })
    await beginEmailVerification(pending.email, pending.kind, pending.owner)
  } catch { /* Keep account existence and delivery details private on public forms. */ }
  return { message: 'If this email is eligible, a new code will arrive shortly. Check Spam and use the latest message. Allow a minute between requests.' }
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
    if (!user || !grant) return { error: 'Your recovery verification has expired. Request a new code.' }
    const consumed = await client.rpc('consume_fitsync_recovery', { grant_id: grant.id, valid_until: new Date(grant.expires).toISOString() })
    if (consumed.error) return { error: 'Password recovery is temporarily unavailable. Your password has not changed. Please try again later.' }
    if (consumed.data !== true) return { error: 'This recovery verification has already been used. Request a new code.' }
    const { error } = await client.auth.updateUser({ password })
    if (error?.code === 'same_password') {
      // Supabase explicitly rejected the change. Allow another password attempt
      // without reviving the consumed grant or extending the verified window.
      await grantRecovery(user.id, session!.access_token, grant.expires)
      const message = 'Choose a password different from your current password. You can try again here.'
      return { error: message, fieldErrors: { password: message } }
    }
    if (error) return { error: error.code === 'weak_password' ? 'This password does not meet the account security requirements. Request a new code and choose a stronger password.' : 'Your password could not be updated. Request a new code before trying again.' }
    // Legacy Google accounts with a username can finish their credential setup
    // using the password just saved instead of prompting to create it twice.
    if (validUsername(user.user_metadata.username)) await client.rpc('complete_fitsync_registration', { chosen_username: user.user_metadata.username })
    ;(await cookies()).delete(recoveryCookie)
    const signedOut = await client.auth.signOut({ scope: 'global' })
    if (signedOut.error) return { error: 'Your password changed, but other sessions could not be signed out. Sign in with your new password and use Sign out everywhere in Settings.' }
  } catch { return { error: 'Unable to update your password right now. Request a new code and try again.' } }
  ;(await cookies()).delete(testerCookie)
  revalidatePath('/', 'layout')
  redirect('/login?password=updated')
}

export async function signOut() {
  ;(await cookies()).delete(testerCookie)
  const client = await authClient()
  ;(await cookies()).delete(recoveryCookie)
  ;(await cookies()).delete(verificationCookie)
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
  const fieldErrors: FieldErrors = {}
  if (!validUsername(username)) fieldErrors.name = 'Use 3-30 letters, numbers, periods, underscores or hyphens. Start with a letter or number.'
  if (Object.keys(fieldErrors).length) return { error: 'Check the highlighted fields.', fieldErrors }
  const client = await authClient()
  if (!client) return unavailable
  try {
    const { data: { user } } = await client.auth.getUser()
    if (!user?.email_confirmed_at) return { error: 'Sign in with a verified email to complete your account.' }
    if (!needsAccountSetup(user)) return { error: 'Your account is already complete. Use password recovery in Settings to change your password.' }
    const status = await client.rpc('fitsync_has_password')
    if (status.error || typeof status.data !== 'boolean') return { error: 'Account setup is temporarily unavailable. Your password has not been changed. Please try again later.' }
    if (!status.data) {
      const passwordErrors = newPasswordErrors(password, formText(form, 'confirmPassword'))
      if (Object.keys(passwordErrors).length) return { error: 'Check the highlighted fields.', fieldErrors: passwordErrors }
      const updated = await client.auth.updateUser({ password })
      if (updated.error) return { error: 'Could not set your FitSync password. Choose a different password or request a recovery link.' }
    }
    const completed = await client.rpc('complete_fitsync_registration', { chosen_username: username })
    if (completed.error) return { error: 'Your password is already set, but your profile could not be saved. Try saving your account details again.' }
    const refreshed = await client.auth.refreshSession()
    if (refreshed.error) return { error: 'Your account details are saved. Sign in again to continue.' }
  } catch { return unavailable }
  revalidatePath('/', 'layout')
  redirect('/')
}
