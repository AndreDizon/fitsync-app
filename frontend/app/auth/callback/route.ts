import { NextResponse, type NextRequest } from 'next/server'
import { authClient, appOrigin } from '@/lib/auth/server'
import { cookies } from 'next/headers'
import { testerCookie } from '@/lib/auth/tester'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const target = request.nextUrl.searchParams.get('next') === '/reset-password' ? '/reset-password' : '/'
  const client = await authClient()
  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code)
    if (!error) { (await cookies()).delete(testerCookie); return NextResponse.redirect(new URL(target, appOrigin())) }
  }
  return NextResponse.redirect(new URL('/login?error=link', appOrigin()))
}
