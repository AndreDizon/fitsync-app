'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authClient, appOrigin } from '@/lib/auth/server'
import { testerLogin, testerCookie } from '@/lib/auth/tester'
import { cookies } from 'next/headers'

export type AuthState = { error?: string; message?: string }
const unavailable = { error: 'Sign-in is temporarily unavailable. Please try again later.' }
const emailFrom = (form: FormData) => String(form.get('email') ?? '').trim().toLowerCase()
const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = emailFrom(form)
  const password = String(form.get('password') ?? '')
  if (!email || email.length > 254 || !password || password.length > 128) return { error: 'Enter your sign-in details.' }
  if (await testerLogin(email, password)) { revalidatePath('/', 'layout'); redirect('/') }
  if (!validEmail(email)) return { error: 'Unable to sign in. Check your sign-in details.' }
  const client = await authClient()
  if (!client) return unavailable
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Unable to sign in. Check your details and confirm your email, or reset your password.' }
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const email = emailFrom(form)
  const password = String(form.get('password') ?? '')
  const name = String(form.get('name') ?? '').trim()
  if (!validEmail(email) || name.length < 2 || name.length > 60) return { error: 'Enter your name and a valid email address.' }
  if (password.length < 12 || password.length > 128) return { error: 'Use a password between 12 and 128 characters.' }
  if (password !== form.get('confirmPassword')) return { error: 'Your passwords do not match.' }
  const client = await authClient()
  if (!client) return unavailable
  const { data, error } = await client.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${appOrigin()}/auth/callback` } })
  if (error) return { error: 'Unable to create an account. Try again later, or sign in if you already have an account.' }
  if (data.session) { revalidatePath('/', 'layout'); redirect('/') }
  return { message: 'Check your inbox to confirm your email. If you already have an account, you can sign in or reset your password.' }
}

export async function googleSignIn(_: AuthState): Promise<AuthState> {
  const client = await authClient()
  if (!client) return unavailable
  const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${appOrigin()}/auth/callback`, scopes: 'openid email profile', queryParams: { prompt: 'select_account' } } })
  if (error || !data.url) return { error: 'Google sign-in is unavailable. Please try again later.' }
  redirect(data.url)
}

export async function forgotPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const email = emailFrom(form)
  if (!validEmail(email)) return { error: 'Enter a valid email address.' }
  const client = await authClient()
  if (!client) return unavailable
  await client.auth.resetPasswordForEmail(email, { redirectTo: `${appOrigin()}/auth/callback?next=/reset-password` })
  return { message: 'If an account matches that email, a password reset link will arrive shortly.' }
}

export async function resetPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get('password') ?? '')
  if (password.length < 12 || password.length > 128) return { error: 'Use a password between 12 and 128 characters.' }
  if (password !== form.get('confirmPassword')) return { error: 'Your passwords do not match.' }
  const client = await authClient()
  if (!client) return unavailable
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: 'This reset link has expired. Request a new one.' }
  const { error } = await client.auth.updateUser({ password })
  if (error) return { error: 'Unable to update your password. Try a different password or request a new link.' }
  await client.auth.signOut({ scope: 'global' })
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
