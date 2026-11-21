'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ClipboardCheck, RefreshCw } from 'lucide-react'
import { HistoryDateFilter } from './gym-history-filter'
import { emptyHistoryRange } from '../../shared/gym-history'
import { gymRequest, gymTimeZoneLabel, type GymMembership } from '@/lib/gym-groups'

type Checkins = {
 today: string; timeZone: string; checkedInAt: string | null; checkedInConfirmedAt: string | null; total: number; pending: number;
 entries: { user_id: string; username: string; checked_on: string; checked_at: string; time_zone: string; confirmed_at: string | null }[];
}
const stamp = (value: string, zone: string) => new Intl.DateTimeFormat(undefined, { timeZone: zone, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value))

export function GymDailyCheckins({ membership, locked }: { membership: GymMembership; locked: boolean }) {
 const admin = membership.role === 'admin'
 const [page, setPage] = useState(0), [version, setVersion] = useState(0)
 const [range,setRange]=useState(emptyHistoryRange)
 const [data, setData] = useState<Checkins | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
 const writing = useRef(false), live = useRef(true)
 const selectedScope = admin ? 'gym' : 'mine'
 useEffect(() => { live.current = true; return () => { live.current = false } }, [])
 useEffect(() => {
  const refresh = () => { if (!document.hidden && !writing.current) setVersion(v => v + 1) }
  const timer = window.setInterval(refresh, 60000)
  window.addEventListener('focus', refresh)
  return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
 }, [])
 useEffect(() => {
  const abort = new AbortController(); setLoading(true); setError('')
  gymRequest('checkins', { scope: selectedScope, page, ...range }, AbortSignal.any([abort.signal, AbortSignal.timeout(30000)])).then((result: Checkins) => {
   if (abort.signal.aborted) return
   setData(result)
   if (page > 0 && page * 20 >= result.total) setPage(Math.max(0, Math.ceil(result.total / 20) - 1))
  }).catch(e => { if (!abort.signal.aborted) { setData(null); setError(e.message) } }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
  return () => abort.abort()
 }, [membership, selectedScope, page, version, range.from, range.to])
 async function checkIn() {
  if (admin || writing.current || locked || loading || data?.checkedInAt) return
  writing.current = true; setBusy(true); setError(''); setNotice('')
  try {
   const result: Checkins = await gymRequest('check_in', { scope: selectedScope, page: 0, ...range })
   if (!live.current) return
   setData(result); setPage(0); setNotice('Your check-in is awaiting admin confirmation.')
  } catch (e) { if (live.current) setError((e as Error).message) }
  finally { writing.current = false; if (live.current) setBusy(false) }
 }
 async function confirmCheckin(entry: Checkins['entries'][number]) {
  if (!admin || writing.current || locked || loading || entry.confirmed_at) return
  writing.current = true; setBusy(true); setError(''); setNotice('')
  try {
   const result: Checkins = await gymRequest('confirm_checkin', { userId: entry.user_id, checkedOn: entry.checked_on, scope: 'gym', page, ...range })
   if (!live.current) return
   setData(result); setNotice(entry.username + "'s check-in confirmed.")
  } catch (e) { if (live.current) setError((e as Error).message) }
  finally { writing.current = false; if (live.current) setBusy(false) }
 }
 const disabled = locked || loading || busy
 const zone = data?.timeZone || membership.gym?.time_zone || 'Asia/Manila'
 return <section className="gg-daily-checkins" aria-labelledby="gym-daily-checkins-title">
  <div className="gg-section-heading"><div><h3 id="gym-daily-checkins-title">{admin ? 'Check-in review' : 'Gym check-in'}</h3><p>{admin ? 'Review member visits and confirm their attendance. Only the gym admin can see this list.' : 'At the gym? Check in once each day, then wait for the gym admin to confirm.'}</p></div><button type="button" aria-label="Refresh check-ins" disabled={disabled} onClick={() => setVersion(v => v + 1)}><RefreshCw size={16}/></button></div>
  {!admin && <div className="gg-checkin-today"><div><strong>{data?.checkedInAt ? (data.checkedInConfirmedAt ? 'Attendance confirmed today' : 'Awaiting admin confirmation') : 'Today’s attendance'}</strong><p className="gg-small">{data?.checkedInAt ? stamp(data.checkedInAt, zone) : 'Tap Check in when you arrive.'}</p></div><button type="button" className="gg-primary" disabled={disabled || !data || !!data.checkedInAt} onClick={() => void checkIn()}>{data?.checkedInAt ? <Check size={17}/> : <ClipboardCheck size={17}/>}{busy ? 'Checking in…' : data?.checkedInAt ? 'Checked in' : 'Check in'}</button></div>}
  <p className="gg-small">One check-in per day in {gymTimeZoneLabel(zone)}. Daily check-ins need admin confirmation and are separate from scheduled-session attendance.</p>
  {notice && <p className="gg-feedback gg-success" role="status">{notice}</p>}
  {error && <p className="gg-feedback gg-error" role="alert">{error} <button type="button" disabled={busy} onClick={() => setVersion(v => v + 1)}>Retry check-ins</button></p>}
  <div className="gg-section-heading gg-checkin-history-heading"><h4>{admin ? 'Member check-ins' : 'Your check-in history'}</h4>{admin && data && <span className="gg-meta">{data.pending} awaiting confirmation</span>}</div>
  <HistoryDateFilter label="Visit date" zone={zone} value={range} disabled={busy||locked} onChange={next=>{setRange(next);setPage(0);setNotice('')}}/>
  {loading ? <p className="gg-empty" role="status">Loading check-ins…</p> : data && (data.entries.length ? <ul className="gg-plain-list gg-checkin-history">{data.entries.map(e => <li key={e.user_id + e.checked_on}><div><strong>{selectedScope === 'gym' ? e.username : 'Gym visit'}</strong><time className="gg-meta" dateTime={e.checked_at}>{stamp(e.checked_at, e.time_zone)}</time></div><div className="gg-actions"><span className={'gg-period-status ' + (e.confirmed_at ? 'gg-period-active' : 'gg-period-upcoming')}>{e.confirmed_at ? 'Confirmed' : 'Pending confirmation'}</span>{admin && !e.confirmed_at && <button type="button" className="gg-primary" disabled={disabled} aria-label={'Confirm check-in for ' + e.username + ' on ' + e.checked_on} onClick={() => void confirmCheckin(e)}>Confirm check-in</button>}</div></li>)}</ul> : <p className="gg-empty">{range.from||range.to ? 'No check-ins in this date range. Clear filters to see all visits.' : selectedScope === 'gym' ? 'No gym visits recorded yet.' : 'No visits recorded yet. Your first check-in will appear here.'}</p>)}
  {data && data.total > 20 && <nav className="gg-pagination" aria-label="Check-in history pages"><button type="button" disabled={disabled || page === 0} onClick={() => setPage(p => p - 1)}>Newer</button><span>Page {page + 1} of {Math.ceil(data.total / 20)}</span><button type="button" disabled={disabled || (page + 1) * 20 >= data.total} onClick={() => setPage(p => p + 1)}>Older</button></nav>}
 </section>
}
