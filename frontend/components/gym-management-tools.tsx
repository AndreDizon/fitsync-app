'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { gymRequest, gymTimeZoneLabel, type GymAction, type GymMembership } from '@/lib/gym-groups'
import { GymDailyCheckins } from './gym-daily-checkins'
import { HistoryDateFilter } from './gym-history-filter'
import { emptyHistoryRange } from '../../shared/gym-history'
import '@/app/gym-management-tools.css'


export function GymGuidance({membership}:{membership:GymMembership}){
 const gym=membership.gym!
 if(!gym.welcome_message&&!gym.rules)return null
 return <section className="gg-guidance" aria-label="Gym welcome and rules">
  {gym.welcome_message&&<><h3>Welcome to {gym.name}</h3><p className="gg-post-body">{gym.welcome_message}</p></>}
  {gym.rules&&<details className="gg-rules"><summary>Gym rules</summary><p className="gg-post-body">{gym.rules}</p></details>}
 </section>
}

export { GymMembershipPlans } from './gym-membership-tools'

type AttendanceSession={id:string;title:string;starts_at:string;ends_at:string;attended:number;my_status:string|null}
type AttendanceMember={user_id:string;username:string;reserved:boolean;status:string}
export function GymAttendance({membership,locked,onAction,view,onViewChange}:{membership:GymMembership;locked:boolean;onAction:GymAction;view?:'daily'|'sessions';onViewChange?:(view:'daily'|'sessions')=>void}){
 const manager=membership.role==='admin'||membership.role==='staff',zone=membership.gym?.time_zone||'Asia/Manila'
 const [sessions,setSessions]=useState<AttendanceSession[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(0),[id,setId]=useState(''),[roster,setRoster]=useState<AttendanceMember[]>([]),[session,setSession]=useState<AttendanceSession|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0)
 const [range,setRange]=useState(emptyHistoryRange)
 const stamp=(value:string)=>new Intl.DateTimeFormat(undefined,{timeZone:zone,year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value))
 useEffect(()=>{
  if(view==='daily'){setLoading(false);return}
  const abort=new AbortController();setLoading(true);setError('')
  gymRequest('attendance',id?{id}:{page,...range},AbortSignal.any([abort.signal,AbortSignal.timeout(30000)])).then(data=>{if(abort.signal.aborted)return;if(id){setRoster(data.roster);setSession(data.session)}else{setSessions(data.sessions);setTotal(data.total);if(page>0&&page*20>=data.total)setPage(Math.max(0,Math.ceil(data.total/20)-1))}}).catch(e=>{if(!abort.signal.aborted)setError(e.message)}).finally(()=>{if(!abort.signal.aborted)setLoading(false)})
  return()=>abort.abort()
 },[membership,id,page,version,range.from,range.to,view])
 const SessionContainer=view==='sessions'?'section':'details'
 return <section>{view&&<nav className="gg-attendance-modes" aria-label="Attendance type"><button type="button" aria-pressed={view==='daily'} onClick={()=>onViewChange?.('daily')}><strong>Daily gym visits</strong><span>{membership.role==='admin'?'Review and confirm check-ins':'Your check-in and confirmation status'}</span></button><button type="button" aria-pressed={view==='sessions'} onClick={()=>onViewChange?.('sessions')}><strong>Session attendance</strong><span>{manager?'Mark attendance on a session roster':'View your scheduled-session history'}</span></button></nav>}{view!=='sessions'&&<GymDailyCheckins key={membership.role} membership={membership} locked={locked}/>} {view!=='daily'&&<SessionContainer className="gg-session-attendance">{!view&&<summary>Scheduled session attendance</summary>}<h3>{manager?'Session attendance':'Your session attendance'}</h3><p className="gg-small">Times follow {gymTimeZoneLabel(zone)}. A reservation is not attendance; staff mark attendance after a session starts. Members see only their own attendance status.</p>
  {!id&&<HistoryDateFilter label="Session date" zone={zone} value={range} onChange={next=>{setRange(next);setPage(0)}}/>}
  {id&&<button type="button" className="gg-back" onClick={()=>setId('')}><ArrowLeft size={16}/>All sessions</button>}
  {loading&&<p className="gg-empty" role="status">Loading attendance…</p>}{error&&<p className="gg-feedback gg-error" role="alert">{error} <button type="button" onClick={()=>setVersion(v=>v+1)}>Retry attendance</button></p>}
  {!loading&&!error&&(id&&session?<><h4>{session.title}</h4><p className="gg-small">{stamp(session.starts_at)}</p>{new Date(session.starts_at)>new Date()&&<p className="gg-feedback">This session has not started. You can review reservations now and mark attendance after it starts.</p>}<ul className="gg-plain-list gg-attendance-roster">{roster.map(m=><li key={m.user_id}><div><strong>{m.username}</strong><span className="gg-meta">{m.reserved?'Reserved a place':'No reservation'}</span></div><div className="gg-field"><label htmlFor={'attendance-'+m.user_id}>Attendance for {m.username}</label><select id={'attendance-'+m.user_id} value={m.status} disabled={locked||new Date(session.starts_at)>new Date()} onChange={async e=>{if(await onAction('mark_attendance',{id:session.id,userId:m.user_id,status:e.target.value},'Attendance updated.'))setVersion(v=>v+1)}}><option value="unmarked">Not marked</option><option value="attended">Attended</option><option value="absent">Absent</option><option value="excused">Excused</option></select></div></li>)}</ul></>:!sessions.length?<p className="gg-empty">{range.from||range.to?'No sessions in this date range. Clear filters to see all sessions.':'No gym sessions yet. Attendance history will appear here after sessions are scheduled.'}</p>:<div className="gg-posts">{sessions.map(s=><article className="gg-post" key={s.id}><div className="gg-section-heading"><div><h4>{s.title}</h4><p>{stamp(s.starts_at)}</p></div><ClipboardCheck size={19}/></div><div className="gg-session-footer"><span>{manager?`${s.attended} attended`:'Your status: '+(s.my_status||'not marked')}</span>{manager&&<button type="button" disabled={locked} onClick={()=>setId(s.id)}>View roster & attendance</button>}</div></article>)}</div>)}
  {!id&&total>20&&<nav className="gg-pagination" aria-label="Attendance pages"><button disabled={loading||locked||page===0} onClick={()=>setPage(n=>n-1)}>Newer</button><span>Page {page+1} of {Math.ceil(total/20)}</span><button disabled={loading||locked||(page+1)*20>=total} onClick={()=>setPage(n=>n+1)}>Older</button></nav>}
 </SessionContainer>}</section>
}
