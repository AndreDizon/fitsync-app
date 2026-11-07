import { authenticate } from '../../../lib/auth'
import { readPlaylistBody } from '../../../lib/playlist-body'
import { blankWeek, parsePlanWeek } from '../../../../shared/daily-plans'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function GET(request: Request) {
  const auth = await authenticate(request); if (auth.response) return auth.response
  const week = new URL(request.url).searchParams.get('week') ?? ''
  if (!parsePlanWeek(blankWeek(week))) return json({ error: 'Choose a valid Monday week start.' }, 400)
  const { data, error } = await auth.client!.from('daily_plan_weeks').select('document,revision').eq('user_id', auth.user!.id).eq('week_start', week).maybeSingle()
  if (error) return json({ error: 'Apply the daily plan database migration to enable account storage.' }, 503)
  return json({ data: data ? { ...data.document, revision: data.revision } : null, userId: auth.user!.id })
}
export async function PUT(request: Request) {
  const auth = await authenticate(request); if (auth.response) return auth.response
  const body = await readPlaylistBody(request); if (body.response) return body.response
  const document = parsePlanWeek(body.value)
  if (!document || !Number.isSafeInteger((body.value as { revision: number }).revision) || document.revision >= 2147483646) return json({ error: 'Invalid weekly plan or scheduling values.' }, 400)
  const revision = document.revision
  const row = { document: { ...document, revision: revision + 1 }, revision: revision + 1 }
  const query = revision === 0 ? auth.client!.from('daily_plan_weeks').insert({ ...row, user_id: auth.user!.id, week_start: document.week }) : auth.client!.from('daily_plan_weeks').update(row).eq('user_id', auth.user!.id).eq('week_start', document.week).eq('revision', revision)
  const { data, error } = await query.select('document,revision').maybeSingle()
  if (error?.code === '23505' || !error && !data) return json({ error: 'This week changed on another device. Your local edits are kept; reload the account version to resolve.' }, 409)
  if (error) return json({ error: 'Unable to save this week. Check the daily plan database migration.' }, 503)
  return json({ data: { ...data!.document, revision: data!.revision }, userId: auth.user!.id })
}
