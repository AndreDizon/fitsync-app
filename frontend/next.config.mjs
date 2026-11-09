import { fileURLToPath } from 'node:url'
import { backendOrigin } from '../shared/deployment.mjs'

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url))
/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  async headers() {
    return [{ source: '/exercise-library-sw.js', headers: [
      { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      { key: 'Service-Worker-Allowed', value: '/' },
    ] }, { source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
      ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
    ] }]
  },
  async rewrites() {
    const backendUrl = backendOrigin()
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }]
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
