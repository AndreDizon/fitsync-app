import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { currentTester } from './tester'
import { readCompletedOnboarding, type OnboardingProfile } from '../../../shared/onboarding'

const profileCookie = 'fitsync-tester-preferences'
export async function testerOnboarding(): Promise<OnboardingProfile | null> {
  if (!await currentTester()) return null
  const secret = process.env.DEV_TEST_SESSION_SECRET
  const token = (await cookies()).get(profileCookie)?.value
  if (!secret || !token || token.length > 3800) return null
  try {
    const [payload, signature, extra] = token.split('.')
    if (!payload || !signature || extra) return null
    const expected = createHmac('sha256', secret).update(payload).digest()
    const supplied = Buffer.from(signature, 'base64url')
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null
    return readCompletedOnboarding(JSON.parse(Buffer.from(payload, 'base64url').toString()))
  } catch { return null }
}
export async function saveTesterOnboarding(profile: OnboardingProfile) {
  if (!await currentTester() || !process.env.DEV_TEST_SESSION_SECRET) throw new Error('Tester session required')
  const payload = Buffer.from(JSON.stringify(profile)).toString('base64url')
  const signature = createHmac('sha256', process.env.DEV_TEST_SESSION_SECRET).update(payload).digest('base64url')
  if (payload.length + signature.length > 3800) throw new Error('Preferences are too long')
  ;(await cookies()).set(profileCookie, `${payload}.${signature}`, { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 60 * 60 * 24 * 30 })
}
