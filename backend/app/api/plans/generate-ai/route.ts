import { authenticate } from '../../../../lib/auth'
import { readPlaylistBody } from '../../../../lib/playlist-body'
import { formulateAiDay } from '../../../../lib/ai-plan'
import { readCompletedOnboarding } from '../../../../../shared/onboarding'
import { validWorkoutDate, workoutDayIndex, nutritionDateNote, workoutDateNote } from '../../../../../shared/workout-program'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
// Burst protection per running instance; OpenRouter's account quotas also apply.
const requests = new Map<string, { count: number; until: number }>()
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const profile = readCompletedOnboarding(auth.user!.user_metadata.fitsync_onboarding)
  if (!profile) return reply({ error: 'Finish onboarding before formulating a personal plan.' }, 400)
  const body = await readPlaylistBody(request)
  if (body.response) return body.response
  const raw = body.value as { kind?: string; day?: number; variation?: number; date?: string }
  if (!raw || !['workout', 'nutrition'].includes(raw.kind ?? '') || !Number.isInteger(raw.day) || raw.day! < 0 || raw.day! > 6 || !Number.isInteger(raw.variation) || raw.variation! < 0 || raw.variation! > 100000) return reply({ error: 'Invalid AI formulation request.' }, 400)
  if (raw.date !== undefined && (typeof raw.date !== 'string' || !validWorkoutDate(raw.date) || workoutDayIndex(raw.date) !== raw.day)) return reply({ error: 'The selected date does not match this weekday.' }, 400)
  const issue = raw.kind === 'workout' ? workoutDateNote(profile, raw.date) : nutritionDateNote(profile, raw.date)
  if (issue) return reply({ error: issue }, 400)
  const now = Date.now(), uid = auth.user!.id, usage = requests.get(uid)
  if (usage && usage.until > now && usage.count >= 4) return reply({ error: 'Please wait a minute before formulating another AI plan.' }, 429)
  for (const [id, entry] of requests) if (entry.until <= now) requests.delete(id)
  requests.set(uid, usage && usage.until > now ? { ...usage, count: usage.count + 1 } : { count: 1, until: now + 60000 })
  try {
    const result = await formulateAiDay(profile, raw.kind as 'workout' | 'nutrition', raw.day!, raw.variation!, request.signal, raw.date)
    return reply({ ...result, userId: uid })
  } catch (error) { return reply({ error: error instanceof Error ? error.message : 'AI formulation is unavailable. Try System formulate.' }, 503) }
}
