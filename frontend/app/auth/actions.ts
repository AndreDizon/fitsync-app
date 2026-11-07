'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authClient, appOrigin } from '@/lib/auth/server'
import { testerLogin, testerCookie } from '@/lib/auth/tester'
import { cookies } from 'next/headers'
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
  if (name.length < 2 || name.length > 60 || /[\u0000-\u001f]/.test(name)) fieldErrors.name = 'Use 2–60 characters for your name.'
  if (Object.keys(fieldErrors).length) return { error: 'Check the highlighted fields.', fieldErrors }
  const client = await authClient()
  if (!client) return unavailable
  let session = false
  try {
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${appOrigin()}/auth/callback` } })
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
  catch { return { error: 'Unable to request a reset link right now. Please try again later.' } }
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
    if (!user) return { error: 'This reset link has expired. Request a new one.' }
    const { error } = await client.auth.updateUser({ password })
    if (error) return { error: 'Unable to update your password. Try a different password or request a new link.' }
    await client.auth.signOut({ scope: 'global' })
  } catch { return { error: 'Unable to update your password right now. Request a new link and try again.' } }
  ;(await cookies()).delete(testerCookie)
  revalidatePath('/', 'layout')
  redirect('/login?password=updated')
}

export async function signOut() {
  ;(await cookies()).delete(testerCookie)
  const client = await authClient()
  if (client) await client.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
