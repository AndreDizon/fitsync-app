import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { backendOrigin, deploymentErrors } from '../shared/deployment.mjs'

const env = {
  VERCEL: '1', BACKEND_URL: 'https://fitsync-backend.example',
  NEXT_PUBLIC_SITE_URL: 'https://fitsync.example',
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_build_check_only',
}
assert.deepEqual(deploymentErrors('frontend', env), [])
assert.deepEqual(deploymentErrors('backend', env), [])
assert.equal(backendOrigin({}), 'http://127.0.0.1:3001')
assert.equal(backendOrigin({ BACKEND_URL: 'http://localhost:3001/' }), 'http://localhost:3001')
assert.equal(backendOrigin({ ...env, BACKEND_URL: `${env.BACKEND_URL}/` }), env.BACKEND_URL)
for (const value of ['', 'http://localhost:3001', 'https://127.0.0.1', 'https://api.example/api', 'https://user:pass@api.example', 'https://api.example?token=private', env.NEXT_PUBLIC_SITE_URL]) {
  assert(deploymentErrors('frontend', { ...env, BACKEND_URL: value }).length > 0, 'Invalid backend origin accepted')
}
assert(deploymentErrors('frontend', { ...env, NEXT_PUBLIC_SITE_URL: '' }).length > 0)
assert(deploymentErrors('backend', { ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' }).length > 0)
assert(deploymentErrors('backend', { ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_not_a_public_key' }).length > 0)
const serviceRoleExample = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.not-a-real-key`
assert(deploymentErrors('backend', { ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: serviceRoleExample }).length > 0)
assert.deepEqual(deploymentErrors('backend', { ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public_legacy_key' }), [])
assert.deepEqual(deploymentErrors('frontend', {}), [])
for (const app of ['frontend', 'backend']) {
  const config = JSON.parse(await readFile(`${app}/vercel.json`, 'utf8'))
  assert.equal(config.framework, 'nextjs')
  assert.equal(config.buildCommand, 'npm run build')
  assert.equal(config.installCommand, 'npm ci --include=dev --prefix ..')
  assert.equal(config.outputDirectory, '.next')
  assert.equal(JSON.parse(await readFile(`${app}/package.json`, 'utf8')).engines.node, '24.x')
}
console.log('PASS: two Vercel workspace configs, Node 24, public environment validation, API origins and local-development fallback')
