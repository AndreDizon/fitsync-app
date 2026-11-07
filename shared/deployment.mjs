// Build-time validation only. Never print environment variable values.
function httpsOrigin(value, name) {
  let url
  try { url = new URL(value) } catch { throw new Error(`${name} must be an absolute HTTPS origin.`) }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error(`${name} must be a public HTTPS origin without a path, credentials or query string.`)
  }
  return url.origin
}

export function backendOrigin(env = process.env) {
  const value = env.BACKEND_URL?.trim()
  if (!value) {
    if (env.VERCEL === '1') throw new Error('Set BACKEND_URL on the frontend Vercel project to the deployed backend origin, then redeploy. Localhost cannot reach a separate Vercel project.')
    return 'http://127.0.0.1:3001'
  }
  if (env.VERCEL === '1') {
    const origin = httpsOrigin(value, 'BACKEND_URL')
    if (env.NEXT_PUBLIC_SITE_URL && origin === httpsOrigin(env.NEXT_PUBLIC_SITE_URL, 'NEXT_PUBLIC_SITE_URL')) throw new Error('BACKEND_URL must point to the backend project, not back to the frontend.')
    return origin
  }
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('BACKEND_URL must be an HTTP(S) origin without a path, credentials or query string.')
  return url.origin
}

export function deploymentErrors(app, env = process.env) {
  if (!['frontend', 'backend'].includes(app)) throw new Error('Choose frontend or backend.')
  if (env.VERCEL !== '1') return []
  const errors = []
  const check = callback => { try { callback() } catch (error) { errors.push(error.message) } }
  check(() => httpsOrigin(env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'))
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key?.trim() || /YOUR_|PLACEHOLDER/i.test(key)) errors.push('Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY) to the Supabase public key.')
  if (key?.startsWith('sb_secret_')) errors.push('Use a public Supabase publishable/anon key in NEXT_PUBLIC variables, never a secret key.')
  if (key?.startsWith('eyJ')) {
    try {
      if (JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'service_role') errors.push('Use the Supabase anon key, not the service-role key, in NEXT_PUBLIC variables.')
    } catch { errors.push('The legacy Supabase public key is not a valid JWT-shaped key.') }
  }
  if (app === 'frontend') {
    check(() => httpsOrigin(env.NEXT_PUBLIC_SITE_URL, 'NEXT_PUBLIC_SITE_URL'))
    check(() => backendOrigin(env))
  }
  return [...new Set(errors)]
}
