'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Info, RefreshCw, X } from 'lucide-react'
import '@/app/sync-status.css'

type Props = { label: string; message: string; problem?: boolean; pending?: boolean; signedIn?: boolean; working?: boolean; infoOnly?: boolean; details?: ReactNode; onSync?: () => Promise<string | void>; onRefresh?: () => Promise<string | void> }
export function SyncStatus({ label, message, problem = false, pending = false, signedIn = false, working = false, infoOnly = false, details, onSync, onRefresh }: Props) {
  const [open, setOpen] = useState(false), [syncing, setSyncing] = useState(false), [result, setResult] = useState(''), [failure, setFailure] = useState(''), [online, setOnline] = useState(true)
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), mounted = useRef(true), id = useId()
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { setResult(''); setFailure('') }, [message, signedIn])
  useEffect(() => { const update = () => setOnline(navigator.onLine); update(); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) } }, [])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  async function sync(refresh = false) {
    if (syncing || working || (refresh ? !onRefresh : !signedIn || !onSync)) return
    setSyncing(true); setFailure(''); setResult('')
    try {
      if (!refresh && !navigator.onLine) throw new Error('You are offline. Reconnect, then choose Sync now. Your saved device copies are kept.')
      const note = refresh ? await onRefresh!() : await onSync!()
      if (mounted.current) setResult(note || (refresh ? 'Your displayed data is refreshed.' : 'Your latest saved changes are synced.'))
    } catch (error) { if (mounted.current) setFailure((error as Error).message) }
    finally { if (mounted.current) setSyncing(false) }
  }
  const issue = problem || !!failure || (signedIn && !online)
  return <div ref={root} className={'sync-status-control' + (issue ? ' has-problem' : pending ? ' is-pending' : '')}>
    <button ref={trigger} className="sync-status-trigger" type="button" aria-label={label + (issue ? ': needs attention' : pending ? ': changes pending' : ': sync information')} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}><Info size={20} aria-hidden="true"/></button>
    <div hidden={!open} className="sync-status-bubble" id={id} role="dialog" aria-label={label}>
      <header><strong>{label}</strong><button type="button" aria-label="Close sync information" onClick={() => { setOpen(false); trigger.current?.focus() }}><X size={16}/></button></header>
      <p role="status" aria-live="polite">{syncing || working ? 'Updating your data…' : failure || (!online && signedIn ? 'You are offline. Saved device copies are kept; reconnect to sync.' : result || message)}</p>
      {details}{onRefresh&&<button type="button" className="sync-status-action sync-status-refresh" disabled={syncing||working} onClick={()=>void sync(true)}><RefreshCw size={15}/>{syncing||working?'Updating…':'Refresh'}</button>}{!infoOnly && (signedIn ? (onSync && (pending || issue || syncing) ? <button type="button" className="sync-status-action" disabled={syncing || working} onClick={() => void sync()}><RefreshCw size={15}/>{syncing || working ? 'Syncing…' : 'Sync now'}</button> : null) : <p className="sync-status-hint">You are using a local preview. Account syncing becomes available after signing in.</p>)}
    </div>
  </div>
}