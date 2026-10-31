import { NextResponse, type NextRequest } from 'next/server'
import { authClient, appOrigin } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  const client = await authClient()
  if (hash && client && (type === 'email' || type === 'signup' || type === 'recovery')) {
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type })
    if (!error) return NextResponse.redirect(new URL(type === 'recovery' ? '/reset-password' : '/', appOrigin()))
  }
  return NextResponse.redirect(new URL('/login?error=link', appOrigin()))
}
