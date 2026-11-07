export async function readPlaylistBody(request: Request): Promise<{ value?: unknown; response?: Response }> {
  const limit = 262144
  const error = (message: string, status: number) => ({ response: Response.json({ error: message }, { status, headers: { 'Cache-Control': 'private, no-store' } }) })
  if (Number(request.headers.get('content-length')) > limit) return error('Playlist is too large.', 413)
  const reader = request.body?.getReader()
  if (!reader) return error('Invalid JSON.', 400)
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) { await reader.cancel(); return error('Playlist is too large.', 413) }
      chunks.push(value)
    }
    const combined = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length }
    return { value: JSON.parse(new TextDecoder().decode(combined)) }
  } catch { return error('Invalid JSON.', 400) }
  finally { reader.releaseLock() }
}
