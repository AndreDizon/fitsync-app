import { authenticate } from '../../../../lib/auth'
import { readPlaylistBody } from '../../../../lib/playlist-body'
import { readCompletedOnboarding } from '../../../../../shared/onboarding'
import { formulateDay, planTargets } from '../../../../../shared/daily-plans'
export const dynamic = 'force-dynamic'
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function POST(request: Request) {
  const auth = await authenticate(request); if (auth.response) return auth.response
  const profile = readCompletedOnboarding(auth.user!.user_metadata.fitsync_onboarding)
  if (!profile) return json({ error: 'Finish onboarding before generating a personal plan.' }, 400)
  const body = await readPlaylistBody(request); if (body.response) return body.response
  const raw = body.value as { kind?: string; day?: number; variation?: number; exclude?: string[]; scope?: string }
  if (!raw || !['workout','nutrition'].includes(raw.kind ?? '') || raw.scope !== undefined && !['day','alternative'].includes(raw.scope) || !Number.isInteger(raw.day) || raw.day! < 0 || raw.day! > 6 || !Number.isInteger(raw.variation) || raw.variation! < 0 || raw.variation! > 100000 || !Array.isArray(raw.exclude) || raw.exclude.length > 60 || raw.exclude.some(id => typeof id !== 'string' || id.length > 100)) return json({ error: 'Invalid generation request.' }, 400)
  const result = formulateDay(profile, raw.kind as 'workout' | 'nutrition', raw.day!, raw.variation!, raw.exclude, raw.scope === 'alternative')
  return json({ ...result, targets: planTargets(profile, result.schedule.rest), userId: auth.user!.id })
}
