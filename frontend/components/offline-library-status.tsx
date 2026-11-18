'use client'

import { useEffect, useState } from 'react'
import { SyncStatus } from './sync-status'
import { Download, WifiOff } from 'lucide-react'

type Progress = { phase: 'saving' | 'ready' | 'error'; completed?: number; total?: number; message?: string }
export function OfflineLibraryStatus({ onDownloadingChange, catalog = 'exercise', compact = false }: { compact?: boolean; onDownloadingChange?: (downloading: boolean) => void; catalog?: 'exercise' | 'food' }) {
  const isFood = catalog === 'food'
  const [progress, setProgress] = useState<Progress>({ phase: 'saving', completed: 0, total: isFood ? 1 : 202 })
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
      setProgress({ phase: 'saving', completed: 0, total: isFood ? 1 : 202 })
      const registration = await navigator.serviceWorker.getRegistration('/') || await navigator.serviceWorker.register('/exercise-library-sw.js', { scope: '/', updateViaCache: 'none' })
      if (navigator.onLine) await registration.update().catch(() => {})
      const ready = registration.active || registration.installing || registration.waiting ? registration : await navigator.serviceWorker.ready
      const worker = ready.installing || ready.waiting || ready.active
      if (!worker) throw new Error('Offline worker is unavailable. Reconnect and retry.')
      if (worker.state !== 'activated') await new Promise<void>((resolve, reject) => {
        const finish = () => { if (worker.state === 'activated') { clearTimeout(timer); worker.removeEventListener('statechange', finish); resolve() } }
        const timer = setTimeout(() => { worker.removeEventListener('statechange', finish); reject(new Error('Offline setup timed out. Please retry.')) }, 30000)
        worker.addEventListener('statechange', finish)
        finish()
      })
      if (!disposed) worker.postMessage({ type: isFood ? 'SEED_FOOD_LIBRARY' : 'SEED_EXERCISE_LIBRARY' }, [channel.port2])
    }
    prepare().catch(error => { if (!disposed) setProgress({ phase: 'error', message: error.message }) })
    return () => { disposed = true; channel.port1.close() }
  }, [attempt, isFood])
  const percentage = Math.round((progress.completed ?? 0) / (progress.total || 1) * 100)
  if (compact) return <SyncStatus label={isFood ? 'Nutrition library offline status' : 'Exercise library offline status'} infoOnly problem={progress.phase==='error'} pending={progress.phase==='saving'} message={progress.phase==='ready' ? (isFood?'All 100 foods, nutrients and serving measurements are saved on this device for offline use.':'All 100 exercises and their demonstrations are saved on this device for offline use.') : progress.phase==='saving' ? 'Preparing offline access: '+percentage+'%. Keep this page open while the download finishes.' : progress.message||'Offline access is not ready. Reconnect and retry.'} details={<>{progress.phase==='saving'&&<><p>{isFood?'Saving the food catalog on this device.':'The one-time exercise download is about 32 MB.'}</p><progress aria-label="Offline download progress" max={100} value={percentage}/></>}{progress.phase==='error'&&<button className="sync-status-action" onClick={()=>setAttempt(value=>value+1)}>Retry download</button>}</>}/>
  return <aside className={`exercise-offline-status is-${progress.phase}`} aria-label={isFood ? 'Offline nutrition library status' : 'Offline library status'}>
    {progress.phase === 'ready' ? <WifiOff size={16} /> : <Download size={16} />}
    <div role="status">{progress.phase === 'ready' ? <><span>{isFood ? 'Note: The nutrition library works offline. All 100 foods, nutrients and serving measurements are saved on this device.' : 'Note: The exercise library works offline, including all 100 exercises and their demonstrations.'}</span></> : progress.phase === 'saving' ? <><strong>Preparing offline access… {percentage}%</strong><span>{isFood ? 'Saving the food catalog on this device. Keep this page open.' : 'One-time download of about 32 MB. Keep this page open.'}</span></> : <><strong>Offline access not ready</strong><span>{progress.message || 'Reconnect and retry to finish saving this device’s copy.'}</span></>}</div>
    {progress.phase === 'error' ? <button onClick={() => setAttempt(value => value + 1)}>Retry download</button> : progress.phase === 'saving' ? <progress aria-label="Offline download progress" max={100} value={percentage} /> : null}
  </aside>
}
