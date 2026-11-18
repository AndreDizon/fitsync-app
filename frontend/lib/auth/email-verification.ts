import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { validEmail } from './validation'

export type EmailVerification = { email: string; kind: 'signup' | 'recovery'; owner?: string; expires: number }
export const verificationCookie = 'fitsync-email-verification'
const lifetime = 15 * 60
function secret() {
  const value = process.env.AUTH_FLOW_SECRET
  if (!value || value.length < 32) throw new Error('Email verification is unavailable')
  return value
}

// Store only the intended email and purpose, never the emailed code or password.
export async function beginEmailVerification(email: string, kind: EmailVerification['kind'], owner?: string) {
  if (!validEmail(email)) throw new Error('Invalid verification email')
  const body = Buffer.from(JSON.stringify({ email, kind, owner, expires: Date.now() + lifetime * 1000 })).toString('base64url')
  const signature = createHmac('sha256', secret()).update(body).digest('base64url')
  ;(await cookies()).set(verificationCookie, `${body}.${signature}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: lifetime })
}

export async function readEmailVerification(): Promise<EmailVerification | null> {
  try {
    const value = (await cookies()).get(verificationCookie)?.value
    if (!value || value.length > 2048) return null
    const [body, signature, extra] = value.split('.')
    if (!body || !signature || extra) return null
    const expected = createHmac('sha256', secret()).update(body).digest()
    const supplied = Buffer.from(signature, 'base64url')
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null
    const pending = JSON.parse(Buffer.from(body, 'base64url').toString())
    return typeof pending.email === 'string' && validEmail(pending.email) && ['signup', 'recovery'].includes(pending.kind) && typeof pending.expires === 'number' && pending.expires > Date.now() && (pending.owner === undefined || typeof pending.owner === 'string') ? pending : null
  } catch { return null }
}
