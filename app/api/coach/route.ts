import { convertToModelMessages, streamText } from 'ai'

export async function POST(request: Request) {
  const { messages } = await request.json()
  const result = streamText({
    model: 'google/gemini-3.7-flash',
    system: 'You are FitSync AI Coach. Give concise, encouraging, practical wellness guidance about movement, recovery, nutrition, and habits. Do not diagnose medical conditions. Ask one helpful follow-up when context is missing.',
    messages: await convertToModelMessages(messages),
  })
  return result.toUIMessageStreamResponse()
}
