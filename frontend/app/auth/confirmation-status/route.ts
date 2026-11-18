import { NextResponse, type NextRequest } from 'next/server'
import { authClient } from '@/lib/auth/server'
import { hasRecovery } from '@/lib/auth/recovery'

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return new NextResponse(null, { status: 403 })
  const body = await request.json().catch(() => null)
  const client = await authClient()
  const user = client ? (await client.auth.getUser()).data.user : null
  const identityMatches = !!user?.email_confirmed_at && typeof body?.email === 'string' && (user.email?.toLowerCase() === body.email.trim().toLowerCase() || (body.kind === 'recovery' && user.id === body.email))
  let confirmed = identityMatches
  if (body?.kind === 'recovery') {
    const session = client ? (await client.auth.getSession()).data.session : null
    confirmed = !!(identityMatches && user && session && await hasRecovery(user.id, session.access_token))
  }
  return NextResponse.json({ confirmed }, { headers: { 'Cache-Control': 'private, no-store' } })
}
