'use client'
import { useRef, useState } from 'react'
import { clearProgressCopies } from '@/lib/progress'
import { signOut } from '@/app/auth/actions'
import { usePlanAccount } from '@/lib/playlist-account'
import { clearDailyPlanCopies } from '@/lib/daily-plans'
import { clearOfflinePlaylists } from '@/lib/playlists'
import { pendingPlanEdits, syncBeforeSignout } from '@/lib/plan-signout'
export function PlanSignout() {
  const owner = usePlanAccount(), [count,setCount] = useState(0), [error,setError] = useState(''), [busy,setBusy] = useState(false)
  const cancel = useRef<HTMLButtonElement>(null)
  async function leave() { clearProgressCopies(); clearDailyPlanCopies(); await clearOfflinePlaylists(); await signOut() }
  async function check() { setBusy(true); setError(''); try { const pending = await pendingPlanEdits(owner); if (pending) { setCount(pending); requestAnimationFrame(() => cancel.current?.focus()) } else await leave() } catch { setError('Unable to check saved changes. Stay signed in and try again.') } finally { setBusy(false) } }
  return <><button className="signout" disabled={busy} onClick={check}>Sign out</button>{error && !count && <p role="alert">{error}</p>}{count > 0 && <div className="plan-signout-backdrop" onKeyDown={event => { if(event.key==='Escape'&&!busy)setCount(0); if(event.key==='Tab'){const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}} }}><section role="dialog" aria-modal="true" aria-labelledby="plan-signout-title" className="plan-signout-dialog"><h2 id="plan-signout-title">Your changes have not synced yet</h2><p>{count} private plan, playlist or activity copies have pending edits or conflicts. Signing out clears private device copies. Sync first to keep those changes in your account.</p>{error && <p role="alert">{error}</p>}<div><button disabled={busy} ref={cancel} onClick={() => setCount(0)}>Stay signed in</button><button className="primary" disabled={busy} onClick={async () => { if(!owner)return;setBusy(true);setError('');try{await syncBeforeSignout(owner);await leave()}catch(e){setError((e as Error).message)}finally{setBusy(false)} }}>{busy?'Syncing...':'Sync first & sign out'}</button><button disabled={busy} onClick={async()=>{setBusy(true);try{await leave()}catch{setError('Could not sign out. Try again.');setBusy(false)}}}>Discard device edits & sign out</button></div></section></div>}</>
}
