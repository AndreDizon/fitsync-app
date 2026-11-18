import { Webhook } from 'standardwebhooks'
import { renderAuthEmail, sendAuthEmail } from '../../../../lib/auth-email'

export const runtime = 'nodejs'
export const maxDuration = 10
const json = (status: number) => Response.json(status === 200 ? {} : { error: { http_code: status, message: 'Authentication email could not be delivered.' } }, { status, headers: { 'Cache-Control': 'no-store' } })

/** Supabase authenticates this endpoint with a signed raw body, not a user JWT. */
export async function POST(request: Request) {
  const secret = process.env.SUPABASE_SEND_EMAIL_HOOK_SECRET?.replace(/^v1,/, '')
  if (!secret) return json(503)
  const headers = Object.fromEntries(request.headers)
  if (!headers['webhook-id'] || !headers['webhook-timestamp'] || !headers['webhook-signature']) return json(401)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json(415)
  const limit = 65536
  if (Number(request.headers.get('content-length')) > limit) return json(413)
  const reader = request.body?.getReader()
  if (!reader) return json(400)
  let payload: unknown
  try {
    const chunks: Uint8Array[] = []
    let length = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) { await reader.cancel(); return json(413) }
      chunks.push(value)
    }
    // The library checks signature and timestamp before parsing the signed JSON.
    payload = new Webhook(secret).verify(Buffer.concat(chunks), headers)
  } catch { return json(401) }
  finally { reader.releaseLock() }
  let message: ReturnType<typeof renderAuthEmail>
  try { message = renderAuthEmail(payload) }
  catch { return json(422) }
  try {
    await sendAuthEmail(message, AbortSignal.timeout(4500))
    return json(200)
  } catch {
    // Never log recipient addresses, tokens, bodies, or Google responses.
    console.error('FitSync authentication email delivery failed. Check Gmail authorization and provider logs.')
    return json(503)
  }
}
