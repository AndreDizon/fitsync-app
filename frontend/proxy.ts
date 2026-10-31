import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { testerCookie, verifyTesterSession } from '@/lib/auth/tester'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const api = path.startsWith('/api/')
  const isPublic = ['/login', '/signup', '/forgot-password'].includes(path) || path.startsWith('/auth/') || path === '/api/health'
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('authorization')
  let response = NextResponse.next({ request: { headers: requestHeaders } })
  const finish = (target: NextResponse) => {
    response.cookies.getAll().forEach(cookie => target.cookies.set(cookie))
    target.headers.set('Cache-Control', 'private, no-store')
    return target
  }
  let authenticated = false
  const localTester = verifyTesterSession(request.cookies.get(testerCookie)?.value, request.headers.get('host') ?? '')
  if (url && key) {
    const client = createServerClient(url, key, {
      cookieOptions: { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: values => {
          values.forEach(({ name, value }) => request.cookies.set(name, value))
          requestHeaders.set('cookie', request.cookies.toString())
          const priorCookies = response.cookies.getAll()
          response = NextResponse.next({ request: { headers: requestHeaders } })
          priorCookies.forEach(cookie => response.cookies.set(cookie))
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    })
    const { data: { user } } = await client.auth.getUser()
    authenticated = !!user
    if (authenticated && api) {
      const { data: { session } } = await client.auth.getSession()
      if (session) {
        requestHeaders.set('authorization', `Bearer ${session.access_token}`)
        const cookies = response.cookies.getAll()
        response = NextResponse.next({ request: { headers: requestHeaders } })
        cookies.forEach(cookie => response.cookies.set(cookie))
      }
    }
  }
  if (localTester && !api && path !== '/reset-password') authenticated = true
  if (!isPublic && !authenticated) {
    return finish(api ? NextResponse.json({ error: 'Authentication required' }, { status: 401 }) : NextResponse.redirect(new URL('/login', request.url)))
  }
  if (authenticated && ['/login', '/signup'].includes(path)) return finish(NextResponse.redirect(new URL('/', request.url)))
  return finish(response)
}

export const config = { matcher: ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/auth/:path*', '/api/:path*'] }
