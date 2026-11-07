import { playlistColumns, playlistResult } from '../../../lib/playlist-record'
import { readPlaylistBody } from '../../../lib/playlist-body'
import { authenticate } from '../../../lib/auth'
import { parsePlaylist } from '../../../../shared/playlists'

export const dynamic = 'force-dynamic'
const fields = 'id,kind,duration,name,description,items,selected_day,rest_days,revision,created_at,updated_at'
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
function databaseError(code: string | undefined) {
  return json({ error: code === '42P01' || code === 'PGRST205' || code === 'PGRST204' ? 'Playlist storage is not set up yet. Apply both playlist database migrations.' : 'Unable to save or load playlists. Please retry.' }, 503)
}
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const kind = new URL(request.url).searchParams.get('kind')
  if (kind !== 'workout' && kind !== 'nutrition') return json({ error: 'Choose a valid playlist type.' }, 400)
  const offset = Number(new URL(request.url).searchParams.get('offset') || 0)
  if (!Number.isInteger(offset) || offset < 0 || offset > 10000) return json({ error: 'Invalid collection page.' }, 400)
  const { data, error } = await auth.client!.from('plan_playlists').select(fields).eq('user_id', auth.user!.id).eq('kind', kind).order('updated_at', { ascending: false }).order('id').range(offset, offset + 99)
  if (error) return databaseError(error.code)
  return json({ data: data.map(playlistResult), userId: auth.user!.id })
}
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const body = await readPlaylistBody(request)
  if (body.response) return body.response
  const raw = body.value
  const parsed = parsePlaylist(raw)
  if (!parsed.data) return json({ error: parsed.error }, 400)
  const { data, error } = await auth.client!.from('plan_playlists').insert({ ...playlistColumns(parsed.data), user_id: auth.user!.id }).select(fields).single()
  if (error?.code === '23505') return json({ error: 'This playlist already exists. Reload your playlists.' }, 409)
  if (error) return databaseError(error.code)
  return json({ data: playlistResult(data), userId: auth.user!.id }, 201)
}
