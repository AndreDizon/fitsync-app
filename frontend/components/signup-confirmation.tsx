'use client'

import { useEffect, useState } from 'react'

const channelName = (kind: 'signup' | 'recovery') => `fitsync-${kind}-confirmed`

// Messages contain no credentials. The original tab verifies its shared session
// with the server before navigating, including a match to the submitted email.
export function useSignupConfirmation(email: string, waiting: boolean) {
  useAuthHandoff(email, waiting, 'signup')
}

export function useRecoveryHandoff(identity: string, waiting: boolean) {
  useAuthHandoff(identity, waiting, 'recovery')
}

function useAuthHandoff(identity: string, waiting: boolean, kind: 'signup' | 'recovery') {
  useEffect(() => {
    if (!waiting || !identity) return
    let channel: BroadcastChannel | undefined
    let checking = false
    let disposed = false
    async function check(nonce?: string) {
      if (checking) return
      checking = true
      try {
        const response = await fetch('/auth/confirmation-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: identity, kind }), cache: 'no-store' })
        if (response.ok && (await response.json()).confirmed && !disposed) {
          if (nonce) channel?.postMessage({ type: 'received', nonce })
          window.location.replace(kind === 'recovery' ? '/reset-password' : '/')
        }
      } catch { /* Keep the waiting form usable when offline. */ }
      finally { checking = false }
    }
    try {
      channel = new BroadcastChannel(channelName(kind))
      channel.onmessage = event => {
        if (event.data?.type === 'confirmed' && typeof event.data.nonce === 'string') void check(event.data.nonce)
      }
    } catch { /* Focus checks also work without BroadcastChannel. */ }
    const onFocus = () => { void check() }
    window.addEventListener('focus', onFocus)
    return () => { disposed = true; channel?.close(); window.removeEventListener('focus', onFocus) }
  }, [identity, waiting, kind])
}

export function SignupConfirmed({ kind = 'signup' }: { kind?: 'signup' | 'recovery' }) {
  const [handedBack, setHandedBack] = useState(false)
  const destination = kind === 'recovery' ? '/reset-password' : '/'
  useEffect(() => {
    let channel: BroadcastChannel | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      channel = new BroadcastChannel(channelName(kind))
      const nonce = crypto.randomUUID()
      channel.onmessage = event => {
        if (event.data?.type !== 'received' || event.data.nonce !== nonce) return
        clearTimeout(timer)
        setHandedBack(true)
        // Some browsers allow closing an email-opened tab; others require the user.
        window.close()
      }
      channel.postMessage({ type: 'confirmed', nonce })
      timer = setTimeout(() => window.location.replace(destination), 4000)
    } catch { window.location.replace(destination) }
    return () => { clearTimeout(timer); channel?.close() }
  }, [kind, destination])
  return <main className="auth-page"><section className="auth-form-panel" style={{ margin: 'auto', maxWidth: 520, padding: 32 }}><h1>{kind === 'recovery' ? 'Recovery link verified.' : 'Email confirmed.'}</h1><p role="status">{handedBack ? 'Your original FitSync tab has been updated. You can close this tab and continue there.' : 'Returning you to FitSync...'}</p><a className="auth-submit" href={destination}>Continue in this tab</a></section></main>
}
