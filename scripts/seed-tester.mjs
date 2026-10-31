import { randomBytes, scryptSync } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.env.NODE_ENV === 'production') throw new Error('Local tester accounts cannot be seeded in production.')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(root, 'frontend', '.env.local')
const email = 'admin'
const password = 'admin'
const salt = randomBytes(16).toString('hex')
const values = {
  DEV_TEST_AUTH: 'true',
  DEV_TEST_ADMIN_EMAIL: email,
  DEV_TEST_ADMIN_HASH: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
  DEV_TEST_SESSION_SECRET: randomBytes(48).toString('hex'),
}
let source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
source = source.split(/\r?\n/).filter(line => !Object.keys(values).some(key => line.startsWith(`${key}=`))).join('\n').trimEnd()
fs.writeFileSync(file, `${source}\n${Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n')}\n`)
fs.mkdirSync(path.join(root, 'logs'), { recursive: true })
fs.writeFileSync(path.join(root, 'logs', 'tester-credentials.json'), JSON.stringify({ email, password }, null, 2))
console.log(`Local tester seeded.\nEmail: ${email}\nPassword: ${password}\nOnly available on localhost in development. Restart the dev server if needed.`)
