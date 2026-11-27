/** Retry transient reads once; never repeat a write or destructive operation. */
export async function accountRequest(url: string, init: RequestInit, label: string) {
  const reading = !init.method || init.method === 'GET'
  let response: Response | undefined
  for (let attempt = 0; attempt < (reading ? 2 : 1); attempt++) {
    try { response = await fetch(url, init); break }
    catch (error) {
      if ((error as Error).name === 'AbortError' || (error as Error).name === 'TimeoutError' || init.signal?.aborted) throw new Error(label + ' took too long. Check your connection and refresh to retry. Your saved records are kept.')
      if (reading && attempt === 0 && (typeof navigator === 'undefined' || navigator.onLine)) continue
      throw new Error('Could not reach the account service. Check your connection and refresh. Your saved records are kept.')
    }
  }
  const data = await response!.json().catch(() => null)
  if (!response!.ok) {
    const fallback = response!.status === 401 ? 'Your session expired. Sign in again to refresh your account data.' : response!.status === 403 ? 'Account access is unavailable. Sign in again to check your access.' : response!.status === 409 ? 'Your account data changed. Reload before continuing.' : 'The account service is temporarily unavailable. Refresh to retry. Your saved records are kept.'
    throw Object.assign(new Error(typeof data?.error === 'string' ? data.error : fallback), { status: response!.status })
  }
  if (!data || typeof data !== 'object') throw new Error('The account service returned an unreadable response. Refresh to retry. Your saved records are kept.')
  return data
}
