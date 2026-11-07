import { playlistColumns, playlistResult } from '../../../../lib/playlist-record'
import { readPlaylistBody } from '../../../../lib/playlist-body'
import { authenticate } from '../../../../lib/auth'
import { isUUID, parsePlaylist } from '../../../../../shared/playlists'

export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ id: string }> }
const fields = 'id,kind,duration,name,description,items,selected_day,rest_days,revision,created_at,updated_at'
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function PUT(request: Request, context: Context) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const { id } = await context.params
  if (!isUUID(id)) return json({ error: 'Invalid playlist ID.' }, 400)
  const body = await readPlaylistBody(request)
  if (body.response) return body.response
  const raw = body.value
  const parsed = parsePlaylist(raw)
  if (!parsed.data || parsed.data.id !== id || !raw || typeof raw !== 'object' || !('revision' in raw) || typeof raw.revision !== 'number' || !Number.isSafeInteger(raw.revision) || raw.revision < 1 || raw.revision > 2147483646) return json({ error: parsed.error || 'Invalid revision or playlist ID.' }, 400)
  const { data, error } = await auth.client!.from('plan_playlists').update({ ...playlistColumns(parsed.data), revision: raw.revision + 1 }).eq('id', id).eq('user_id', auth.user!.id).eq('revision', raw.revision).select(fields).maybeSingle()
  if (error) return json({ error: 'Could not save the playlist. Please retry.' }, 503)
  if (!data) return json({ error: 'This playlist changed on another device or is no longer available. Reload before saving again.' }, 409)
  return json({ data: playlistResult(data), userId: auth.user!.id })
}
export async function DELETE(request: Request, context: Context) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const { id } = await context.params
  const revision = Number(new URL(request.url).searchParams.get('revision'))
  if (!isUUID(id) || !Number.isSafeInteger(revision) || revision < 1 || revision > 2147483646) return json({ error: 'Invalid playlist ID or revision.' }, 400)
  const { data, error } = await auth.client!.from('plan_playlists').delete().eq('id', id).eq('user_id', auth.user!.id).eq('revision', revision).select('id')
  if (error) return json({ error: 'Could not delete the playlist. Please retry.' }, 503)
  if (!data?.length) return json({ error: 'This playlist changed or is no longer available. Reload before deleting.' }, 409)
  return json({ deleted: id, userId: auth.user!.id })
}
