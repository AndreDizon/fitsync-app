import { NextResponse, type NextRequest } from 'next/server'
import { authClient, appOrigin } from '@/lib/auth/server'
import { cookies } from 'next/headers'
import { grantRecovery } from '@/lib/auth/recovery'
import { testerCookie } from '@/lib/auth/tester'

export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  const client = await authClient()
  if (hash && client && (type === 'email' || type === 'signup' || type === 'recovery')) {
    const { data, error } = await client.auth.verifyOtp({ token_hash: hash, type })
    if (!error) {
      if (type === 'recovery' && data.session && data.user) {
        try { await grantRecovery(data.user.id, data.session.access_token) }
        catch { return NextResponse.redirect(new URL('/forgot-password?error=link', appOrigin())) }
      }
      (await cookies()).delete(testerCookie); return NextResponse.redirect(new URL(type === 'recovery' ? '/auth/recovered' : '/auth/confirmed', appOrigin())) }
  }
  return NextResponse.redirect(new URL('/login?error=link', appOrigin()))
}
