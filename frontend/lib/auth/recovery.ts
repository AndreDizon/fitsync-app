import 'server-only'
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const recoveryCookie = 'fitsync-recovery'
const lifetime = 15 * 60
function secret() {
  const value = process.env.AUTH_FLOW_SECRET
  if (!value || value.length < 32) throw new Error('Password recovery is not configured')
  return value
}
function sessionKey(token: string) {
  return createHash('sha256').update(token).digest('base64url')
}
export async function grantRecovery(userId: string, accessToken: string) {
  const body = Buffer.from(JSON.stringify({ id: randomUUID(), userId, session: sessionKey(accessToken), expires: Date.now() + lifetime * 1000 })).toString('base64url')
  const signature = createHmac('sha256', secret()).update(body).digest('base64url')
  ;(await cookies()).set(recoveryCookie, body + '.' + signature, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: lifetime })
}
export async function readRecovery(userId: string, accessToken: string): Promise<{ id: string; expires: number } | null> {
  try {
    const token = (await cookies()).get(recoveryCookie)?.value
    if (!token || token.length > 1024) return null
    const [body, signature, extra] = token.split('.')
    if (!body || !signature || extra) return null
    const expected = createHmac('sha256', secret()).update(body).digest()
    const supplied = Buffer.from(signature, 'base64url')
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null
    const grant = JSON.parse(Buffer.from(body, 'base64url').toString())
    return typeof grant.id === 'string' && grant.userId === userId && grant.session === sessionKey(accessToken) && grant.expires > Date.now() ? { id: grant.id, expires: grant.expires } : null
  } catch { return null }
}
export async function hasRecovery(userId: string, accessToken: string) {
  return !!await readRecovery(userId, accessToken)
}
