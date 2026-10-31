import { convertToModelMessages, streamText } from 'ai'
import { authenticate } from '../../../lib/auth'

export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  if (!process.env.AI_GATEWAY_API_KEY) {
    return Response.json({ error: 'Configure AI_GATEWAY_API_KEY in backend/.env.local to use the AI coach.' }, { status: 503 })
  }
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }
  const { messages } = body ?? {}
  if (!Array.isArray(messages)) {
    return Response.json({ error: 'messages must be an array.' }, { status: 400 })
  }
  const result = streamText({
    model: 'google/gemini-3.7-flash',
    system: 'You are FitSync AI Coach. Give concise, encouraging, practical wellness guidance about movement, recovery, nutrition, and habits. Do not diagnose medical conditions. Ask one helpful follow-up when context is missing.',
    messages: await convertToModelMessages(messages),
  })
  return result.toUIMessageStreamResponse()
}
