'use client'

import { useEffect, useState } from 'react'
import { Download, WifiOff } from 'lucide-react'

type Progress = { phase: 'saving' | 'ready' | 'error'; completed?: number; total?: number; message?: string }
export function OfflineLibraryStatus({ onDownloadingChange }: { onDownloadingChange?: (downloading: boolean) => void }) {
  const [progress, setProgress] = useState<Progress>({ phase: 'saving', completed: 0, total: 202 })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => { onDownloadingChange?.(progress.phase === 'saving') }, [progress.phase, onDownloadingChange])
  useEffect(() => {
    const reconnect = () => setAttempt(value => value + 1)
    window.addEventListener('online', reconnect)
    return () => window.removeEventListener('online', reconnect)
  }, [])
  useEffect(() => {
    let disposed = false
    const channel = new MessageChannel()
    channel.port1.onmessage = event => { if (!disposed) setProgress(event.data) }
    async function prepare() {
      if (!('serviceWorker' in navigator) || !window.isSecureContext) throw new Error('Offline downloads need HTTPS or localhost in a supported browser.')
      setProgress({ phase: 'saving', completed: 0, total: 202 })
      const registration = await navigator.serviceWorker.getRegistration('/') || await navigator.serviceWorker.register('/exercise-library-sw.js', { scope: '/', updateViaCache: 'none' })
      if (navigator.onLine) registration.update().catch(() => {})
      const ready = registration.active ? registration : await navigator.serviceWorker.ready
      if (!disposed) ready.active?.postMessage({ type: 'SEED_EXERCISE_LIBRARY' }, [channel.port2])
    }
    prepare().catch(error => { if (!disposed) setProgress({ phase: 'error', message: error.message }) })
    return () => { disposed = true; channel.port1.close() }
  }, [attempt])
  const percentage = Math.round((progress.completed ?? 0) / (progress.total || 1) * 100)
  return <aside className={`exercise-offline-status is-${progress.phase}`} aria-label="Offline library status">
    {progress.phase === 'ready' ? <WifiOff size={16} /> : <Download size={16} />}
    <div role="status">{progress.phase === 'ready' ? <><span>Note: The exercise library works offline, including all 100 exercises and their demonstrations.</span></> : progress.phase === 'saving' ? <><strong>Preparing offline access… {percentage}%</strong><span>One-time download of about 32 MB. Keep this page open.</span></> : <><strong>Offline access not ready</strong><span>{progress.message || 'Reconnect and retry to finish saving this device’s copy.'}</span></>}</div>
    {progress.phase === 'error' ? <button onClick={() => setAttempt(value => value + 1)}>Retry download</button> : progress.phase === 'saving' ? <progress aria-label="Offline download progress" max={100} value={percentage} /> : null}
  </aside>
}
