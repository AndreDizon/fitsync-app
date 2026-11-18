import { NextResponse, type NextRequest } from 'next/server'
import { authClient, appOrigin } from '@/lib/auth/server'
import { cookies } from 'next/headers'
import { grantRecovery } from '@/lib/auth/recovery'
import { testerCookie } from '@/lib/auth/tester'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const target = request.nextUrl.searchParams.get('next') === '/reset-password' ? '/reset-password' : '/'
  const client = await authClient()
  if (code && client) {
    const { data, error } = await client.auth.exchangeCodeForSession(code)
    if (!error) {
      if (target === '/reset-password') {
        if ((data as typeof data & { redirectType?: string | null }).redirectType !== 'recovery' || !data.session) return NextResponse.redirect(new URL('/forgot-password?error=link', appOrigin()))
        try { await grantRecovery(data.user.id, data.session.access_token) }
        catch { return NextResponse.redirect(new URL('/forgot-password?error=link', appOrigin())) }
      }
      (await cookies()).delete(testerCookie); return NextResponse.redirect(new URL(target, appOrigin())) }
  }
  return NextResponse.redirect(new URL('/login?error=link', appOrigin()))
}
