import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

type Envelope = { version: 1; keyId: string; iv: string; tag: string; ciphertext: string }
function keys() {
  const values = JSON.parse(process.env.PRIVATE_DATA_ENCRYPTION_KEYS || '{}') as Record<string, string>
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid private data key configuration')
  for (const [id, key] of Object.entries(values)) if (!/^[a-zA-Z0-9_-]{1,32}$/.test(id) || typeof key !== 'string' || !/^[a-f0-9]{64}$/i.test(key)) throw new Error('Invalid private data key configuration')
  return values
}
function keyFor(id: string, owner: string) {
  const values = keys()
  const key = Object.hasOwn(values, id) ? values[id] : undefined
  if (!key || !owner) throw new Error('Private data key unavailable')
  return Buffer.from(hkdfSync('sha256', Buffer.from(key, 'hex'), Buffer.from(owner), Buffer.from('fitsync-private-data-v1'), 32))
}
export function seal(value: unknown, owner: string, context: string): Envelope {
  const keyId = process.env.PRIVATE_DATA_ENCRYPTION_ACTIVE_KEY || 'v1'
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', keyFor(keyId, owner), iv)
  cipher.setAAD(Buffer.from(context))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return { version: 1, keyId, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }
}
export function unseal(envelope: unknown, owner: string, context: string): Record<string, unknown> {
  const e = envelope as Envelope
  if (!e || e.version !== 1 || typeof e.keyId !== 'string' || typeof e.iv !== 'string' || typeof e.tag !== 'string' || typeof e.ciphertext !== 'string') throw new Error('Invalid encrypted record')
  const iv = Buffer.from(e.iv, 'base64'), tag = Buffer.from(e.tag, 'base64')
  if (iv.length !== 12 || tag.length !== 16 || e.ciphertext.length > 2000000) throw new Error('Invalid encrypted record')
  const decipher = createDecipheriv('aes-256-gcm', keyFor(e.keyId, owner), iv)
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(tag)
  const value = JSON.parse(Buffer.concat([decipher.update(Buffer.from(e.ciphertext, 'base64')), decipher.final()]).toString('utf8'))
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid encrypted content')
  return value
}
export function sealPhoto(bytes: Buffer, owner: string, id: string): Buffer {
  const keyId = process.env.PRIVATE_DATA_ENCRYPTION_ACTIVE_KEY || 'v1'
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', keyFor(keyId, owner), iv)
  cipher.setAAD(Buffer.from('progress-photo:' + id))
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()])
  return Buffer.concat([Buffer.from('FSE1'), Buffer.from([keyId.length]), Buffer.from(keyId), iv, cipher.getAuthTag(), ciphertext])
}
export function openPhoto(bytes: Buffer, owner: string, id: string): Buffer {
  if (bytes.subarray(0, 4).toString() !== 'FSE1') {
    // Existing JPEG uploads remain viewable until the migration tool converts them.
    if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return bytes
    throw new Error('Invalid stored photo')
  }
  const length = bytes[4], offset = 5 + length
  if (length < 1 || length > 32 || bytes.length < offset + 29) throw new Error('Invalid stored photo')
  const decipher = createDecipheriv('aes-256-gcm', keyFor(bytes.subarray(5, offset).toString(), owner), bytes.subarray(offset, offset + 12))
  decipher.setAAD(Buffer.from('progress-photo:' + id)); decipher.setAuthTag(bytes.subarray(offset + 12, offset + 28))
  return Buffer.concat([decipher.update(bytes.subarray(offset + 28)), decipher.final()])
}
export const encryptedTables = ['plan_playlists', 'daily_plan_weeks', 'progress_entries'] as const
export type PrivateTable = typeof encryptedTables[number]
type Row = Record<string, any>
function context(table: PrivateTable, row: Row) {
  const identity = table === 'daily_plan_weeks' ? row.week_start : row.id
  if (!identity || !Number.isInteger(row.revision) || row.revision < 1) throw new Error('Missing encrypted record identity')
  // Bind ciphertext to its owner (derived key), table, record and revision.
  return JSON.stringify([table, identity, row.revision])
}
export function encryptRow(table: PrivateTable, row: Row, owner: string): Row {
  if (row.user_id && row.user_id !== owner) throw new Error('Record owner mismatch')
  if (table === 'plan_playlists') {
    const { name, description, items, selected_day, rest_days, ...metadata } = row
    return { ...metadata, name: 'Encrypted playlist', description: '', items: [], selected_day: 0, rest_days: [], encrypted_data: seal({ name, description, items, selected_day, rest_days }, owner, context(table, row)) }
  }
  if (table === 'daily_plan_weeks') return { ...row, document: { week: row.week_start, revision: row.revision }, encrypted_data: seal({ document: row.document }, owner, context(table, row)) }
  return { ...row, payload: typeof row.payload?.path === 'string' ? { path: row.payload.path } : {}, encrypted_data: seal({ payload: row.payload }, owner, context(table, row)) }
}
export function decryptRow(table: PrivateTable, row: Row, owner: string): Row {
  if (row.user_id && row.user_id !== owner) throw new Error('Record owner mismatch')
  if (!row.encrypted_data) return row // Legacy rows are converted by the migration script.
  const content = unseal(row.encrypted_data, owner, context(table, row))
  const allowed = table === 'plan_playlists' ? ['name','description','items','selected_day','rest_days'] : table === 'daily_plan_weeks' ? ['document'] : ['payload']
  if (Object.keys(content).some(key => !allowed.includes(key)) || allowed.some(key => !(key in content))) throw new Error('Invalid encrypted fields')
  const { encrypted_data, ...metadata } = row
  return { ...metadata, ...content }
}

/** Only the verified-user backend client uses this adapter; public/Auth/Storage requests pass through. */
export function privateDataFetch(owner: string, transport: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const table = url.pathname.match(/^\/rest\/v1\/([^/]+)$/)?.[1] as PrivateTable
    if (!encryptedTables.includes(table)) return transport(input, init)
    try {
      const next = { ...init }, method = (init?.method || 'GET').toUpperCase()
      if (url.searchParams.has('select')) {
        const select = url.searchParams.get('select')!
        if (select !== '*') url.searchParams.set('select', [...new Set([...select.split(','), 'encrypted_data', 'user_id', 'revision', table === 'daily_plan_weeks' ? 'week_start' : 'id'])].join(','))
      }
      if (['POST','PATCH'].includes(method)) {
        if (typeof init?.body !== 'string') throw new Error('Invalid private write')
        const raw = JSON.parse(init.body), rows = Array.isArray(raw) ? raw : [raw]
        const result = rows.map((row: Row) => {
          const filter = (key: string) => { const value = url.searchParams.get(key); return value?.startsWith('eq.') ? value.slice(3) : undefined }
          const identity = table === 'daily_plan_weeks' ? 'week_start' : 'id'
          return encryptRow(table, { ...row, user_id: owner, [identity]: row[identity] || filter(identity), revision: row.revision ?? 1 }, owner)
        })
        // A PATCH must not attempt identity changes; the filters still enforce owner/revision.
        next.body = JSON.stringify(Array.isArray(raw) ? result : result[0])
      }
      const response = await transport(url, next)
      if (!response.ok || response.status === 204) return response
      const raw = await response.json()
      const convert = (row: Row) => decryptRow(table, row, owner)
      const result = Array.isArray(raw) ? raw.map(convert) : raw && typeof raw === 'object' ? convert(raw) : raw
      const headers = new Headers(response.headers); headers.delete('content-length'); headers.delete('content-encoding')
      return new Response(JSON.stringify(result), { status: response.status, headers })
    } catch {
      // Never return partial data, ciphertext, key details or a plaintext fallback on errors.
      return Response.json({ code: 'PRIVATE_DATA_UNAVAILABLE', message: 'Private data could not be encrypted or decrypted. Check the server encryption configuration.' }, { status: 503 })
    }
  }
}
