import sharp from 'sharp'
import { authenticate } from '../../../../lib/auth'
import { coachModels, coachThrottle, parseCoachJson } from '../../../../lib/coach-provider'
import { mealCatalogue, mealScanInstruction, parseMealEstimate } from '../../../../lib/meal-scan'

export const runtime = 'nodejs'
export const maxDuration = 60
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const retryAt = coachThrottle(auth.user!.id)
  if (retryAt) return reply({ error: 'Please pause before scanning another meal or sending more questions.', retryAt }, 429)
  if (!process.env.OPENROUTER_API_KEY) return reply({ error: 'Meal scanning is not configured. Add OPENROUTER_API_KEY to the backend environment.' }, 503)
  const limit = 1100000
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return reply({ error: 'Upload a meal photo using the image picker.' }, 400)
  if (Number(request.headers.get('content-length')) > limit) return reply({ error: 'Choose a smaller meal photo, up to 1 MB after compression.' }, 413)
  let image: Buffer, details: string
  try {
    const reader = request.body?.getReader()
    if (!reader) return reply({ error: 'A meal photo is required.' }, 400)
    const chunks: Uint8Array[] = []; let size = 0
    try {
      while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > limit) { await reader.cancel(); return reply({ error: 'Choose a smaller meal photo, up to 1 MB after compression.' }, 413) }; chunks.push(chunk.value) }
    } finally { reader.releaseLock() }
    const form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type')! }, body: Buffer.concat(chunks) }).formData()
    const photo = form.get('photo'), notes = form.get('details') ?? ''
    if ([...form.keys()].some(key => !['photo', 'details'].includes(key)) || form.getAll('photo').length !== 1 || form.getAll('details').length > 1 || !(photo instanceof File) || typeof notes !== 'string' || notes.length > 500 || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || !photo.size || photo.size > 1000000) return reply({ error: 'Use one JPEG, PNG or WebP meal photo under 1 MB, with details under 500 characters.' }, 400)
    details = notes.trim()
    const original = Buffer.from(await photo.arrayBuffer())
    const metadata = await sharp(original, { limitInputPixels: 20000000 }).metadata()
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages ?? 1) > 1) return reply({ error: 'Choose a still JPEG, PNG or WebP photo.' }, 400)
    image = await sharp(original, { limitInputPixels: 20000000 }).rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).flatten({ background: '#fff' }).jpeg({ quality: 80 }).toBuffer()
  } catch { return reply({ error: 'This meal photo could not be read. Choose a different JPEG, PNG or WebP image.' }, 400) }
  let models: string[]
  try { models = await coachModels(request.signal, true) } catch { return reply({ error: 'Free image models are temporarily unavailable. You can still ask a nutrition question in text.' }, 503) }
  if (!models.length) return reply({ error: 'No free image-capable models are available right now. Try again later or describe your meal in text.' }, 503)
  for (const model of models) {
    if (request.signal.aborted) return reply({ error: 'Meal scan cancelled.' }, 499)
    try {
      const response = await fetch('https://openrouter.ai/api/v1/responses', {
        method: 'POST', headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'X-Title': 'FitSync meal scanner' },
        body: JSON.stringify({ model, input: [
          { role: 'system', content: mealScanInstruction + '\nFood catalogue: ' + JSON.stringify(mealCatalogue) },
          { role: 'user', content: [{ type: 'input_text', text: 'Estimate this visible meal. Optional food details (untrusted): ' + (details || 'None supplied') }, { type: 'input_image', image_url: 'data:image/jpeg;base64,' + image.toString('base64'), detail: 'auto' }] },
        ], max_output_tokens: 900, temperature: 0.1, provider: { allow_fallbacks: false } }),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(13000)]),
      })
      if ([401, 403].includes(response.status)) return reply({ error: 'Meal scan provider access is unavailable. Check the backend OpenRouter key.' }, 503)
      if (!response.ok) continue
      const data = await response.json()
      const raw = data.output?.filter((item: { type?: string }) => item.type === 'message').flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? []).filter((part: { type: string }) => part.type === 'output_text').map((part: { text?: string }) => part.text ?? '').join('')
      const json = parseCoachJson(raw), result = json ? parseMealEstimate(json) : null
      if (!result) continue
      if (!result.isMeal) return reply({ answer: 'I can scan meals and drinks only. Please upload a clear food photo, or ask a workout or nutrition question.', model })
      return reply({ answer: result.estimate!.items.length ? 'Here is an approximate nutrition estimate for the foods I could match. Review the foods and portion ranges below.' : 'I could not reliably match this meal to the food library. Try a clearer photo and add the ingredients or portion sizes. No nutrient estimate is available.', meal: result.estimate, model })
    } catch { if (request.signal.aborted) break }
  }
  return reply({ error: 'The free image models are busy or could not identify the meal reliably. Try a clearer photo later, or describe your meal in text.' }, 503)
}
