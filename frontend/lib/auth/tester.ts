import 'server-only'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { validUsername } from '../../../shared/account-security'

export const testerCookie = 'fitsync-local-tester'
const attempts = new Map<string, { count: number; until: number }>()

export function testerEnabled(host: string) {
  if (process.env.NODE_ENV !== 'development' || process.env.DEV_TEST_AUTH !== 'true') return false
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${host}`).hostname)
      && !!process.env.DEV_TEST_ADMIN_HASH && !!process.env.DEV_TEST_SESSION_SECRET
  } catch { return false }
}

export function verifyTesterSession(token: string | undefined, host: string) {
  if (!testerEnabled(host) || !token || token.length > 1024) return false
  try {
    const [payload, signature, extra] = token.split('.')
    if (!payload || !signature || extra) return false
    const expected = createHmac('sha256', process.env.DEV_TEST_SESSION_SECRET!).update(payload).digest()
    const received = Buffer.from(signature, 'base64url')
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return session.email === process.env.DEV_TEST_ADMIN_EMAIL && session.scope === 'local-ui-tester' && session.exp > Date.now()
  } catch { return false }
}

export async function currentTester() {
  const host = (await headers()).get('host') ?? ''
  return verifyTesterSession((await cookies()).get(testerCookie)?.value, host)
}

const testerUsernameCookie = 'fitsync-tester-username'
export async function currentTesterUsername() {
  if (!await currentTester()) return 'Test Admin'
  try {
    const [payload, signature] = ((await cookies()).get(testerUsernameCookie)?.value || '').split('.')
    const expected = createHmac('sha256', process.env.DEV_TEST_SESSION_SECRET!).update(payload).digest()
    const supplied = Buffer.from(signature || '', 'base64url')
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return 'Test Admin'
    const username = Buffer.from(payload, 'base64url').toString()
    return validUsername(username) ? username : 'Test Admin'
  } catch { return 'Test Admin' }
}
export async function saveTesterUsername(username: string) {
  if (!await currentTester() || !validUsername(username)) throw new Error('Valid tester session and username required')
  const payload = Buffer.from(username).toString('base64url')
  const signature = createHmac('sha256', process.env.DEV_TEST_SESSION_SECRET!).update(payload).digest('base64url')
  ;(await cookies()).set(testerUsernameCookie, `${payload}.${signature}`, { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 8 * 60 * 60 })
}

export async function testerLogin(email: string, password: string) {
  const host = (await headers()).get('host') ?? ''
  if (!testerEnabled(host) || email !== process.env.DEV_TEST_ADMIN_EMAIL) return false
  const attempt = attempts.get(email)
  if (attempt && attempt.until > Date.now() && attempt.count >= 5) return false
  const current = attempt && attempt.until > Date.now() ? attempt : { count: 0, until: Date.now() + 15 * 60_000 }
  current.count++
  attempts.set(email, current)
  const [salt, hash] = process.env.DEV_TEST_ADMIN_HASH!.split(':')
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (expected.length !== actual.length || !timingSafeEqual(actual, expected)) return false
  attempts.delete(email)
  const payload = Buffer.from(JSON.stringify({ email, scope: 'local-ui-tester', exp: Date.now() + 8 * 60 * 60_000, nonce: randomBytes(16).toString('hex') })).toString('base64url')
  const signature = createHmac('sha256', process.env.DEV_TEST_SESSION_SECRET!).update(payload).digest('base64url')
  ;(await cookies()).set(testerCookie, `${payload}.${signature}`, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60, secure: false })
  return true
}
