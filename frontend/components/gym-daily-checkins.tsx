'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ClipboardCheck, RefreshCw } from 'lucide-react'
import { gymRequest, gymTimeZoneLabel, type GymMembership } from '@/lib/gym-groups'

type Checkins = {
 today: string; timeZone: string; checkedInAt: string | null; total: number;
 entries: { user_id: string; username: string; checked_on: string; checked_at: string; time_zone: string }[];
}
const stamp = (value: string, zone: string) => new Intl.DateTimeFormat(undefined, { timeZone: zone, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value))

export function GymDailyCheckins({ membership, locked }: { membership: GymMembership; locked: boolean }) {
 const manager = membership.role === 'admin' || membership.role === 'staff'
 const [scope, setScope] = useState('mine'), [page, setPage] = useState(0), [version, setVersion] = useState(0)
 const [data, setData] = useState<Checkins | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
 const writing = useRef(false), live = useRef(true)
 const selectedScope = manager ? scope : 'mine'
 useEffect(() => { live.current = true; return () => { live.current = false } }, [])
 useEffect(() => {
  const refresh = () => { if (!document.hidden && !writing.current) setVersion(v => v + 1) }
  const timer = window.setInterval(refresh, 60000)
  window.addEventListener('focus', refresh)
  return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
 }, [])
 useEffect(() => {
  const abort = new AbortController(); setLoading(true); setError('')
  gymRequest('checkins', { scope: selectedScope, page }, AbortSignal.any([abort.signal, AbortSignal.timeout(30000)])).then((result: Checkins) => {
   if (abort.signal.aborted) return
   setData(result)
   if (page > 0 && page * 20 >= result.total) setPage(Math.max(0, Math.ceil(result.total / 20) - 1))
  }).catch(e => { if (!abort.signal.aborted) { setData(null); setError(e.message) } }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
  return () => abort.abort()
 }, [membership, selectedScope, page, version])
 async function checkIn() {
  if (writing.current || locked || loading || data?.checkedInAt) return
  writing.current = true; setBusy(true); setError(''); setNotice('')
  try {
   const result: Checkins = await gymRequest('check_in', { scope: selectedScope, page: 0 })
   if (!live.current) return
   setData(result); setPage(0); setNotice('Your gym attendance is recorded for today.')
  } catch (e) { if (live.current) setError((e as Error).message) }
  finally { writing.current = false; if (live.current) setBusy(false) }
 }
 const disabled = locked || loading || busy
 const zone = data?.timeZone || membership.gym?.time_zone || 'Asia/Manila'
 return <section className="gg-daily-checkins" aria-labelledby="gym-daily-checkins-title">
  <div className="gg-section-heading"><div><h3 id="gym-daily-checkins-title">Gym check-in</h3><p>At the gym? Record your visit once each day. No scheduled session needed.</p></div><button type="button" aria-label="Refresh check-ins" disabled={disabled} onClick={() => setVersion(v => v + 1)}><RefreshCw size={16}/></button></div>
  <div className="gg-checkin-today"><div><strong>{data?.checkedInAt ? 'Checked in today' : 'Today’s attendance'}</strong><p className="gg-small">{data?.checkedInAt ? stamp(data.checkedInAt, zone) : 'Tap Check in when you arrive.'}</p></div><button type="button" className="gg-primary" disabled={disabled || !data || !!data.checkedInAt} onClick={() => void checkIn()}>{data?.checkedInAt ? <Check size={17}/> : <ClipboardCheck size={17}/>}{busy ? 'Checking in…' : data?.checkedInAt ? 'Checked in' : 'Check in'}</button></div>
  <p className="gg-small">One check-in per day in {gymTimeZoneLabel(zone)}. Self-reported visits are separate from staff-marked session attendance.</p>
  {notice && <p className="gg-feedback gg-success" role="status">{notice}</p>}
  {error && <p className="gg-feedback gg-error" role="alert">{error} <button type="button" disabled={busy} onClick={() => setVersion(v => v + 1)}>Retry check-ins</button></p>}
  <div className="gg-section-heading gg-checkin-history-heading"><h4>{selectedScope === 'gym' ? 'Gym check-in history' : 'Your check-in history'}</h4>{manager && <div className="gg-field"><label htmlFor="gym-checkin-scope">Show check-ins</label><select id="gym-checkin-scope" disabled={busy || locked} value={selectedScope} onChange={e => { setScope(e.target.value); setPage(0); setNotice('') }}><option value="mine">Mine</option><option value="gym">All gym members</option></select></div>}</div>
  {loading ? <p className="gg-empty" role="status">Loading check-ins…</p> : data && (data.entries.length ? <ul className="gg-plain-list gg-checkin-history">{data.entries.map(e => <li key={e.user_id + e.checked_on}><div><strong>{selectedScope === 'gym' ? e.username : 'Gym visit'}</strong><time className="gg-meta" dateTime={e.checked_at}>{stamp(e.checked_at, e.time_zone)}</time></div><span className="gg-period-status">Self-reported</span></li>)}</ul> : <p className="gg-empty">{selectedScope === 'gym' ? 'No gym visits recorded yet.' : 'No visits recorded yet. Your first check-in will appear here.'}</p>)}
  {data && data.total > 20 && <nav className="gg-pagination" aria-label="Check-in history pages"><button type="button" disabled={disabled || page === 0} onClick={() => setPage(p => p - 1)}>Newer</button><span>Page {page + 1} of {Math.ceil(data.total / 20)}</span><button type="button" disabled={disabled || (page + 1) * 20 >= data.total} onClick={() => setPage(p => p + 1)}>Older</button></nav>}
 </section>
}
