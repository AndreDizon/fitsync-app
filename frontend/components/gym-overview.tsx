'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { gymRequest, gymTimeZoneLabel, type GymMembership } from '@/lib/gym-groups'
import { dateInZone } from '../../shared/progress'
import { gymMemberCoverage, gymRenewalsDue } from '../../shared/gym-workflow'

type VisitSummary = { today: string; total: number; pending: number; checkedInAt: string | null; checkedInConfirmedAt: string | null }
type OpenSection = (section: string, attendanceView?: 'daily' | 'sessions', membershipFocus?: 'renewals' | 'mine', referenceDay?: string) => void
const day = (value: string) => new Date(value + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })

const OverviewAction = ({ title, detail, onClick, count }: { title: string; detail: string; onClick: () => void; count?: number }) => <button type="button" className="gg-overview-action" onClick={onClick}><span><strong>{title}</strong><small>{detail}</small></span>{count !== undefined && <span className="gg-overview-count">{count}</span>}<ArrowRight size={17}/></button>

export function GymOverview({ membership, owner, onOpen }: { membership: GymMembership; owner: string; onOpen: OpenSection }) {
 const admin = membership.role === 'admin', manager = admin || membership.role === 'staff', zone = membership.gym?.time_zone || 'Asia/Manila'
 const [visits, setVisits] = useState<VisitSummary | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [version, setVersion] = useState(0)
 useEffect(() => {
  const abort = new AbortController(), signal = AbortSignal.any([abort.signal, AbortSignal.timeout(30000)])
  setLoading(true); setError(''); setVisits(null)
  ;(async () => {
   try {
    const date = dateInZone(zone), scope = admin ? 'gym' : 'mine'
    let result: VisitSummary = await gymRequest('checkins', { scope, from: date, to: date, page: 0 }, signal)
    // The database owns "today" even when the device clock is wrong.
    if (result.today !== date) result = await gymRequest('checkins', { scope, from: result.today, to: result.today, page: 0 }, signal)
    if (!abort.signal.aborted) setVisits(result)
   } catch (e) { if (!abort.signal.aborted) setError((e as Error).message) }
   finally { if (!abort.signal.aborted) setLoading(false) }
  })()
  return () => abort.abort()
 }, [membership, admin, zone, version])
 const today = visits?.today || dateInZone(zone), coverage = gymMemberCoverage(membership, owner, today), renewals = gymRenewalsDue(membership, today)
 const upcoming = (membership.sessions || []).filter(s => new Date(s.starts_at).getTime() > Date.now()).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
 const stamp = (value: string) => new Intl.DateTimeFormat(undefined, { timeZone: zone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))

 return <section className="gg-overview" aria-labelledby="gym-overview-title">
  <header className="gg-overview-heading"><div><p className="gg-meta">{day(today)} · {gymTimeZoneLabel(zone)}</p><h3 id="gym-overview-title">{admin ? 'Run your gym' : manager ? 'Your gym, ready for today' : 'Your day at the gym'}</h3><p>{admin ? 'Review visits, welcome members and keep their plans up to date.' : manager ? 'Manage team tasks and keep track of your own training.' : 'Check in, see your next session and review your membership dates.'}</p></div></header>
  {membership.gym?.welcome_message && <div className="gg-overview-welcome"><p>{membership.gym.welcome_message}</p><button type="button" onClick={() => onOpen('settings')}>Welcome &amp; gym rules<ArrowRight size={15}/></button></div>}
  <div className="gg-overview-columns">
   <section className="gg-overview-tasks" aria-label={manager ? 'Next gym tasks' : 'Your next steps'}><h4>{manager ? 'Next tasks' : 'Your next steps'}</h4>
    {admin ? <OverviewAction title="Review daily check-ins" detail={loading ? 'Loading today’s visits…' : error ? 'Open attendance to review check-ins' : `${visits?.total || 0} visits today · ${visits?.pending || 0} awaiting your confirmation`} count={visits?.pending} onClick={() => onOpen('attendance', 'daily')}/> : <OverviewAction title={visits?.checkedInAt ? 'View your check-in' : 'Check in at the gym'} detail={loading ? 'Loading your attendance…' : error ? 'Open attendance to check your status' : visits?.checkedInConfirmedAt ? 'Your visit is confirmed by the admin' : visits?.checkedInAt ? 'Awaiting gym admin confirmation' : 'Record today’s visit when you arrive'} onClick={() => onOpen('attendance', 'daily')}/>}
    {manager && <><OverviewAction title="Review join requests" detail="Approve or decline people waiting to join" count={membership.requests?.length || 0} onClick={() => onOpen('team')}/><OverviewAction title="Review member renewals" detail="Coverage ending within the next 7 days" count={renewals} onClick={() => onOpen('membership',undefined,'renewals',today)}/><OverviewAction title="Mark session attendance" detail="Session rosters; available after a session starts" onClick={() => onOpen('attendance', 'sessions')}/></>}
    {!admin && <OverviewAction title="Your membership dates" detail={coverage.active ? `${coverage.active.plan_name} · Expires ${day(coverage.active.ends_on)}` : coverage.next ? `${coverage.next.plan_name} · Starts ${day(coverage.next.starts_on)}` : coverage.last ? `Last recorded plan ended ${day(coverage.last.ends_on)}` : 'No active or upcoming plan. Ask the gym team about your dates.'} onClick={() => onOpen('membership',undefined,'mine',today)}/>}
    {error && <p className="gg-feedback gg-error" role="alert">Check-in summary unavailable. <button type="button" onClick={() => setVersion(v => v + 1)}><RefreshCw size={14}/>Retry summary</button></p>}
   </section>
   <section className="gg-overview-sessions" aria-label="Upcoming gym sessions"><div className="gg-section-heading"><h4>Upcoming sessions</h4><button type="button" onClick={() => onOpen('sessions')}>View sessions<ArrowRight size={15}/></button></div>
    {!upcoming.length ? <div className="gg-overview-empty"><strong>No upcoming sessions</strong><p>{manager ? 'Schedule a session when the team is ready.' : 'Your gym team’s scheduled sessions will appear here.'}</p><button type="button" onClick={() => onOpen('sessions')}>{manager ? 'Open session scheduling' : 'Open sessions'}</button></div> : <ul className="gg-overview-session-list">{upcoming.slice(0, 3).map(s => <li key={s.id}><strong>{s.title}</strong><time dateTime={s.starts_at}>{stamp(s.starts_at)}</time><p>{s.joined ? 'You reserved a place' : `${s.attending}/${s.capacity} places reserved`}</p><button type="button" onClick={() => onOpen('sessions')}>View session list<ArrowRight size={15}/></button></li>)}</ul>}
   </section>
  </div>
  {admin && <section className="gg-overview-workflow"><h4>Plans, membership and payments</h4><ol><li><button type="button" onClick={() => onOpen('membership-plans')}>1. Define a plan<ArrowRight size={15}/></button><p>Set the duration and listed fee in Plan catalog.</p></li><li><button type="button" onClick={() => onOpen('membership')}>2. Enroll or renew<ArrowRight size={15}/></button><p>Assign the plan to a member and record coverage dates.</p></li><li><button type="button" onClick={() => onOpen('income')}>3. Record received money<ArrowRight size={15}/></button><p>Record actual payments in Income after you receive them.</p></li></ol></section>}
  <details className="gg-overview-help"><summary>How gym membership and attendance work</summary><ul><li>Joining adds you to the gym community. A dated membership plan tracks coverage; expiry does not remove community access.</li><li>Reserving a session holds a place. It does not record attendance or complete a workout.</li><li>A daily check-in records a gym visit for admin confirmation. Session attendance is a separate roster managed by staff or the admin.</li><li>Listed plan fees are not payment confirmations. Only the gym owner records money received; FitSync does not process payments.</li></ul><button type="button" onClick={() => onOpen('settings')}>Read gym rules and information<ArrowRight size={15}/></button></details>
 </section>
}
