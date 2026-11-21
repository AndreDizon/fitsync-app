'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CalendarDays, ClipboardList, MessageCircle, Pin, Plus, Settings2, Users } from 'lucide-react'
import { gymRequest, gymTimeZoneLabel, type GymAction, type GymAnnouncement, type GymMembership, type GymTab } from '@/lib/gym-groups'
import { GymAttendance, GymMembershipPlans } from './gym-management-tools'
import { GymIncome } from './gym-income'
import { GymAdminWorkspace } from './gym-admin-workspace'
import { GymDiscussion } from './gym-discussion'
import { GymOverview } from './gym-overview'
import { HistoryDateFilter, HistoryPagination } from './gym-history-filter'
import { emptyHistoryRange, historyContainsDay } from '../../shared/gym-history'
import { dateInZone } from '../../shared/progress'
import { listPlaylists, savePlaylist } from '@/lib/playlists'
import { parsePlaylist, type Playlist } from '../../shared/playlists'
import { useConfirmation } from './confirm-dialog'
import '@/app/gym-community-tools.css'

const date=(value:string)=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})
const activityLabels:Record<string,string>={guidance:'updated the welcome message and rules',save_plan:'saved a membership plan',archive_plan:'changed plan availability',assign_plan:'recorded a membership for',cancel_period:'cancelled a membership record for',mark_attendance:'updated attendance for',approve:'approved a join request for',reject:'declined a join request from',leave:'left the gym',role_staff:'promoted to staff:',role_member:'changed to member:',transfer:'transferred ownership to',remove:'removed',ban:'banned',unban:'lifted the ban for',update:'updated gym settings',announce:'posted an announcement',edit_announcement:'edited an announcement',pin:'changed a pinned announcement',delete_announcement:'removed an announcement',delete_message:'removed a discussion message',schedule:'scheduled a training session',cancel_session:'cancelled a session',share_playlist:'shared a workout playlist',unshare_playlist:'removed a shared playlist'}
const targetActions=new Set(['approve','reject','role_staff','role_member','transfer','remove','ban','unban','assign_plan','cancel_period','mark_attendance'])
type Props={membership:GymMembership;owner:string;locked:boolean;onAction:GymAction;children:ReactNode;settings?:ReactNode;initialTab?:GymTab;actionError?:string}

export function GymCommunityTools({membership,owner,locked,onAction,children,settings,initialTab,actionError}:Props){
 const manager=membership.role==='admin'||membership.role==='staff',admin=membership.role==='admin'
 const [tab,setTab]=useState<string>(initialTab||'overview')
 const confirm=useConfirmation()
 const [membershipDay,setMembershipDay]=useState<string|undefined>()
 const focusDestination=useRef(false)
 const [membershipFocus,setMembershipFocus]=useState<'all'|'renewals'|'mine'>('all')
 const [requestSearch,setRequestSearch]=useState(''),[requestPage,setRequestPage]=useState(0)
 const requests=(membership.requests||[]).filter(r=>r.username.toLowerCase().includes(requestSearch.trim().toLowerCase()))
 const currentRequestPage=Math.min(requestPage,Math.max(0,Math.ceil(requests.length/10)-1))
 const [attendanceView,setAttendanceView]=useState<'daily'|'sessions'>(initialTab==='attendance'?'sessions':'daily')
 const groups=[
  {id:'today',label:'Your gym today',Icon:CalendarDays,tabs:[{id:'overview',label:'Overview'},{id:'attendance',label:admin?'Check-ins & attendance':'Check in & attendance'},{id:'sessions',label:'Training sessions'}]},
  {id:'membership',label:manager?'Members & membership':'Your membership',Icon:Users,tabs:[{id:'team',label:manager?'Members & requests':'Gym team'},{id:'membership',label:manager?'Member records':'My membership'},{id:'membership-plans',label:admin?'Plan catalog':'Available plans'},...(admin?[{id:'income',label:'Income & payments'}]:[])]},
  {id:'community',label:'Train together',Icon:MessageCircle,tabs:[{id:'announcements',label:'Announcements'},{id:'discussion',label:'Discussion'},{id:'playlists',label:'Workout playlists'}]},
  {id:'gym',label:'Gym information',Icon:Settings2,tabs:[{id:'settings',label:admin?'Gym settings':'Gym info & rules'},...(manager?[{id:'activity',label:'Team activity'}]:[])]},
 ]
 const active=groups.some(group=>group.tabs.some(item=>item.id===tab))?tab:'overview'
 function openSection(id:string,attendance:'daily'|'sessions'='daily',focus?:'renewals'|'mine',referenceDay?:string){if(id==='attendance')setAttendanceView(attendance);if(id==='membership'||id==='membership-plans'){setMembershipFocus(focus||'all');setMembershipDay(focus?referenceDay:undefined)}setTab(id)}
 useEffect(()=>{if(focusDestination.current){focusDestination.current=false;const panel=document.getElementById('gym-community-panel');panel?.focus({preventScroll:true});panel?.scrollIntoView({block:'start',behavior:'instant'})}},[active])
 function arrowNavigation(event:React.KeyboardEvent<HTMLElement>){
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return
  const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button')),index=buttons.indexOf(event.target as HTMLButtonElement)
  if(index<0)return
  event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'||event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length
  buttons[next]?.focus();buttons[next]?.click()
 }
 async function removeBan(userId:string,username:string){if(await confirm({title:'Lift this ban?',message:`${username} will be able to join or request membership again.`,confirmLabel:'Lift ban'}))await onAction('unban',{userId},'Ban lifted.')}
 if(admin)return <GymAdminWorkspace membership={membership} owner={owner} locked={locked} onAction={onAction} settings={settings} initialTab={initialTab} actionError={actionError}/>
 return <div className="gg-tools gg-workspace">
  <nav className="gg-section-directory" aria-label="Gym sections" onKeyDown={arrowNavigation}>{groups.map(group=><div className="gg-navigation-group" key={group.id}><h3><group.Icon size={16}/>{group.label}</h3><div>{group.tabs.map(t=><button key={t.id} id={'gym-nav-'+t.id} type="button" aria-pressed={active===t.id} aria-controls="gym-community-panel" onClick={()=>openSection(t.id)}>{t.label}{t.id==='team'&&manager&&!!membership.requests?.length&&<span className="gg-tab-count" aria-label={membership.requests.length+' pending join requests'}>{membership.requests.length}</span>}</button>)}</div></div>)}</nav>
  <div className="gg-mobile-section-picker"><label htmlFor="gym-section-picker">Gym section</label><select id="gym-section-picker" value={active} onChange={event=>openSection(event.target.value)}>{groups.map(group=><optgroup key={group.id} label={group.label}>{group.tabs.map(item=><option key={item.id} value={item.id}>{item.label}{item.id==='team'&&manager&&membership.requests?.length?' ('+membership.requests.length+' requests)':''}</option>)}</optgroup>)}</select></div>
  <div id="gym-community-panel" role="region" tabIndex={-1} aria-labelledby={'gym-nav-'+active} className="gg-panel">
   {active==='overview'&&<GymOverview key={membership.role} membership={membership} owner={owner} onOpen={(id,attendance,focus,referenceDay)=>{focusDestination.current=true;openSection(id,attendance,focus,referenceDay)}}/>}
   {active==='settings'&&(settings||<p className="gg-empty">Gym information is unavailable. Refresh your gym to try again.</p>)}
   {active==='announcements'&&<Announcements announcements={membership.announcements||[]} manager={manager} locked={locked} onAction={onAction}/>}
   {active==='discussion'&&<GymDiscussion key={membership.gym!.id} membership={membership} owner={owner} locked={locked} onAction={onAction}/>}
   {active==='sessions'&&<Sessions membership={membership} manager={manager} locked={locked} onAction={onAction}/>}
   {active==='attendance'&&<GymAttendance key={membership.role} membership={membership} locked={locked} onAction={onAction} view={attendanceView} onViewChange={setAttendanceView}/>}
   {(active==='membership'||active==='membership-plans')&&<GymMembershipPlans key={membership.role} membership={membership} owner={owner} locked={locked} onAction={onAction} view={active==='membership-plans'?'plans':'records'} renewalsOnly={membershipFocus==='renewals'} initialMember={membershipFocus==='mine'?owner:undefined} referenceDay={membershipDay}/>}
   {active==='income'&&admin&&<GymIncome membership={membership} locked={locked}/>}
   {active==='playlists'&&<SharedPlaylists membership={membership} owner={owner} manager={manager} locked={locked} onAction={onAction}/>}
   {active==='team'&&<>
    {manager&&<section className="gg-requests"><h3>Join requests <span className="gg-inline-count">{membership.requests?.length||0}</span></h3><p className="gg-small">Approve people you want on the team. Requests do not reserve a place.</p><div className="gg-field gg-request-search"><label htmlFor="gym-request-search">Search join requests</label><input id="gym-request-search" type="search" maxLength={100} value={requestSearch} onChange={e=>{setRequestSearch(e.target.value);setRequestPage(0)}}/></div>{!requests.length?<p className="gg-empty">{requestSearch?'No join requests match this name.':'No requests waiting.'}</p>:<ul className="gg-plain-list">{requests.slice(currentRequestPage*10,currentRequestPage*10+10).map(r=><li key={r.user_id}><div><strong>{r.username}</strong><span className="gg-meta">Requested {date(r.created_at)}</span></div><div className="gg-actions"><button className="gg-primary" type="button" disabled={locked||membership.members.length>=100} onClick={()=>void onAction('approve',{userId:r.user_id},'Member approved.')}>Approve</button><button type="button" disabled={locked} onClick={async()=>{if(await confirm({title:'Decline join request?',message:`Decline ${r.username}’s request? They can request again.`,confirmLabel:'Decline request'}))await onAction('reject',{userId:r.user_id},'Request declined.')}}>Decline</button></div></li>)}</ul>}<HistoryPagination page={currentRequestPage} total={requests.length} pageSize={10} previousLabel="Previous" nextLabel="Next" onChange={setRequestPage} label="Join request pages"/></section>}
    {children}
    {admin&&<details className="gg-admin-details"><summary>Banned members ({membership.bans?.length||0})</summary>{!membership.bans?.length?<p className="gg-empty">No banned members.</p>:<ul className="gg-plain-list">{membership.bans.map(b=><li key={b.user_id}><strong>{b.username}</strong><button type="button" disabled={locked} onClick={()=>void removeBan(b.user_id,b.username)}>Lift ban</button></li>)}</ul>}</details>}
   </>}
   {active==='activity'&&manager&&<TeamActivity membership={membership}/>}
  </div>
 </div>
}

function Announcements({announcements,manager,locked,onAction}:{announcements:GymAnnouncement[];manager:boolean;locked:boolean;onAction:GymAction}){
 const [editing,setEditing]=useState<string|null>(null),[title,setTitle]=useState(''),[body,setBody]=useState('')
 const confirm=useConfirmation(),details=useRef<HTMLDetailsElement>(null)
 async function submit(event:React.FormEvent){event.preventDefault();if(await onAction(editing?'edit_announcement':'announce',{id:editing,title,body},editing?'Announcement updated.':'Announcement posted.')){setEditing(null);setTitle('');setBody('');if(details.current)details.current.open=false}}
 return <section><div className="gg-section-heading"><div><h3>Gym announcements</h3><p>Updates from your admin and staff. Pinned notes stay first.</p></div><span className="gg-inline-count">{announcements.length}/50</span></div>
  {manager&&<details ref={details} className="gg-compose"><summary><Plus size={16}/>{editing?'Edit announcement':'Post an announcement'}</summary><form onSubmit={submit}><fieldset disabled={locked}><label>Announcement title<input required minLength={3} maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Announcement message<textarea required maxLength={2000} value={body} onChange={e=>setBody(e.target.value)}/></label><div className="gg-actions"><button className="gg-primary" type="submit">{editing?'Save announcement':'Post announcement'}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setTitle('');setBody('');if(details.current)details.current.open=false}}>Cancel edit</button>}</div></fieldset></form></details>}
  {!announcements.length?<p className="gg-empty">No announcements yet. {manager?'Post a welcome message for your team.':'Your gym team’s updates will appear here.'}</p>:<div className="gg-posts">{announcements.map(a=><article key={a.id} className={a.pinned?'gg-post gg-pinned':'gg-post'}>{a.pinned&&<span className="gg-pin-label"><Pin size={13}/>Pinned</span>}<h4>{a.title}</h4><p className="gg-post-body">{a.body}</p><p className="gg-meta">{a.username} · <time dateTime={a.created_at}>{date(a.created_at)}</time>{a.updated_at!==a.created_at?' · edited':''}</p>{manager&&<div className="gg-actions"><button type="button" disabled={locked} onClick={()=>{setEditing(a.id);setTitle(a.title);setBody(a.body);if(details.current){details.current.open=true;details.current.querySelector('input')?.focus()}}}>Edit</button><button type="button" disabled={locked} onClick={()=>void onAction('pin',{id:a.id,pinned:!a.pinned},a.pinned?'Announcement unpinned.':'Announcement pinned.')}>{a.pinned?'Unpin':'Pin'}</button><button className="gg-danger" type="button" disabled={locked} onClick={async()=>{if(await confirm({title:'Delete announcement?',message:`Remove “${a.title}” from this gym?`,confirmLabel:'Delete announcement',destructive:true})){if(await onAction('delete_announcement',{id:a.id},'Announcement deleted.')){if(editing===a.id){setEditing(null);setTitle('');setBody('')}}}}}>Delete</button></div>}</article>)}</div>}
 </section>
}

export function Sessions({membership,manager,locked,onAction}:{membership:GymMembership;manager:boolean;locked:boolean;onAction:GymAction}){
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[capacity,setCapacity]=useState(10),[error,setError]=useState('')
 const confirm=useConfirmation(),details=useRef<HTMLDetailsElement>(null),sessions=membership.sessions||[]
 const timeZone=membership.gym?.time_zone||'Asia/Manila'
 useEffect(()=>{setStart('');setEnd('');setError('')},[timeZone])
 const sessionDate=(value:string)=>new Intl.DateTimeFormat(undefined,{timeZone,year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(value))
 async function submit(event:React.FormEvent){
  event.preventDefault();setError('')
  if(!start||!end||end<=start){setError('Choose a start and a later end time in the gym’s time zone.');return}
  if(await onAction('schedule',{title,description,startsLocal:start,endsLocal:end,timeZone,capacity},'Session scheduled.')){setTitle('');setDescription('');setStart('');setEnd('');if(details.current)details.current.open=false}
 }
 return <section><h3>Train together</h3><p className="gg-small">Session times use <strong>{gymTimeZoneLabel(timeZone)}</strong>. Joining reserves a place; it does not record attendance or complete a workout.</p>
  {manager&&<details className="gg-compose" ref={details}><summary><Plus size={16}/>Schedule a session</summary><form onSubmit={submit}><fieldset disabled={locked}><label>Session title<input required minLength={3} maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Session details<textarea maxLength={1000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Meeting point, equipment or what to expect"/></label><div className="gg-form-row"><label>Starts (gym time)<input type="datetime-local" required value={start} onChange={e=>setStart(e.target.value)}/></label><label>Ends (gym time)<input type="datetime-local" required value={end} onChange={e=>setEnd(e.target.value)}/></label><label>Participant limit<input type="number" min={1} max={100} required value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label></div>{error&&<p className="gg-feedback gg-error" role="alert">{error}</p>}<button className="gg-primary" type="submit">Schedule session</button></fieldset></form></details>}
  {!sessions.length?<p className="gg-empty">No upcoming sessions. {manager?'Create one when your team is ready.':'Check back for sessions from your gym team.'}</p>:<div className="gg-posts">{sessions.map(s=><article className="gg-post" key={s.id}><h4>{s.title}</h4><p className="gg-session-time"><time dateTime={s.starts_at}>{sessionDate(s.starts_at)}</time> – <time dateTime={s.ends_at}>{sessionDate(s.ends_at)}</time></p>{s.description&&<p className="gg-post-body">{s.description}</p>}<div className="gg-session-footer"><span>{s.attending}/{s.capacity} places filled{s.joined?' · You’re going':''}</span><div className="gg-actions"><button type="button" className={s.joined?'':'gg-primary'} disabled={locked||(!s.joined&&(s.attending>=s.capacity||new Date(s.starts_at)<=new Date()))} onClick={()=>void onAction(s.joined?'unrsvp':'rsvp',{id:s.id},s.joined?'Reservation cancelled.':'Your place is reserved.')}>{s.joined?'Cancel reservation':s.attending>=s.capacity?'Full':new Date(s.starts_at)<=new Date()?'Started':'Join session'}</button>{manager&&<button type="button" className="gg-danger" disabled={locked} onClick={async()=>{if(await confirm({title:'Cancel this session?',message:`Cancel “${s.title}” and remove all reservations?`,confirmLabel:'Cancel session',destructive:true}))await onAction('cancel_session',{id:s.id},'Session cancelled.')}}>Cancel session</button>}</div></div></article>)}</div>}
 </section>
}

export function SharedPlaylists({membership,owner,manager,locked,onAction,initialShare=false}:{membership:GymMembership;owner:string;manager:boolean;locked:boolean;onAction:GymAction;initialShare?:boolean}){
 const [saved,setSaved]=useState<Playlist[]>([]),[selected,setSelected]=useState(''),[loading,setLoading]=useState(false),[importing,setImporting]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[showShare,setShowShare]=useState(false)
 const confirm=useConfirmation(),alive=useRef(true),items=membership.playlists||[]
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 async function loadSaved(){
  setLoading(true);setError('')
  try{const result=await listPlaylists('workout');if(alive.current){setSaved(result.filter(p=>p.items.length>0));setShowShare(true)}}catch(e){if(alive.current)setError((e as Error).message)}finally{if(alive.current)setLoading(false)}
 }
 useEffect(()=>{if(initialShare)void loadSaved()},[])
 async function importPlaylist(id:string){
  if(!await confirm({title:'Save a personal copy?',message:'This copies the shared workout into your playlists. Review its exercises and adjust it to your needs before training.',confirmLabel:'Save copy'}))return
  setImporting(true);setError('');setNotice('')
  try{
   const result=await gymRequest('read_playlist',{id});if(!alive.current)return
   const parsed=parsePlaylist({...result.playlist,id:crypto.randomUUID()})
   if(!parsed.data)throw new Error(parsed.error||'This playlist cannot be imported.')
   const copy=await savePlaylist(parsed.data)
   if(alive.current)setNotice(copy.syncStatus==='pending'?'Copy saved on this device. It will sync when connected.':'Copy saved to your workout playlists.')
  }catch(e){if(alive.current)setError((e as Error).message)}finally{if(alive.current)setImporting(false)}
 }
 const disabled=locked||importing||loading
 return <section><div className="gg-section-heading"><div><h3>Shared workout playlists</h3><p>Share a snapshot with your gym. Your original stays private and later edits do not change the shared copy.</p></div><span className="gg-inline-count">{items.length}/20</span></div>
  <button type="button" disabled={disabled} onClick={()=>void loadSaved()}><Plus size={16}/>{loading?'Loading playlists…':'Share one of my playlists'}</button>
  {showShare&&<form className="gg-compose" onSubmit={async e=>{e.preventDefault();if(!await confirm({title:'Share this workout with your gym?',message:'Gym members will see the selected playlist’s name, description and exercises, and can save their own copy. Check it for personal details before sharing.',confirmLabel:'Share playlist'}))return;if(await onAction('share_playlist',{playlistId:selected},'Workout playlist shared.')){setShowShare(false);setSelected('')}}}><fieldset disabled={disabled}>{!saved.length?<p className="gg-empty">Create a workout playlist with exercises in Plans → Playlist first.</p>:<><div className="gg-field"><label htmlFor="gym-saved-playlist">My workout playlist</label><select id="gym-saved-playlist" required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a playlist</option>{saved.map(p=><option key={p.id} value={p.id} disabled={p.syncStatus==='pending'||p.syncStatus==='conflict'}>{p.name} · {p.items.length} exercises{p.syncStatus==='pending'||p.syncStatus==='conflict'?' (sync first)':''}</option>)}</select></div><p className="gg-small">Share only content you want the gym to see. Copies members save remain theirs after you unshare.</p><button className="gg-primary" type="submit" disabled={!selected}>Share playlist</button></>}<button type="button" onClick={()=>setShowShare(false)}>Close sharing</button></fieldset></form>}
  {error&&<p className="gg-feedback gg-error" role="alert">{error}</p>}{notice&&<p className="gg-feedback gg-success" role="status">{notice}</p>}
  {!items.length?<p className="gg-empty">No shared playlists yet. Members, staff and admin can contribute.</p>:<div className="gg-posts">{items.map(p=><article className="gg-post" key={p.id}><h4>{p.name}</h4>{p.description&&<p className="gg-post-body">{p.description}</p>}<p className="gg-meta">Shared by {p.username} · {p.duration==='week'?'One week':'One day'} · {p.item_count} exercises</p><div className="gg-actions"><button className="gg-primary" type="button" disabled={disabled} onClick={()=>void importPlaylist(p.id)}>{importing?'Saving…':'Save to my playlists'}</button>{(manager||p.author_id===owner)&&<button className="gg-danger" type="button" disabled={disabled} onClick={async()=>{if(await confirm({title:'Unshare this playlist?',message:`Remove “${p.name}” from this gym? Personal copies already saved by members stay available to them.`,confirmLabel:'Unshare playlist',destructive:true}))await onAction('unshare_playlist',{id:p.id},'Playlist unshared.')}}>Unshare</button>}</div></article>)}</div>}
 </section>
}

function TeamActivity({membership}:{membership:GymMembership}){
 const [range,setRange]=useState(emptyHistoryRange),[page,setPage]=useState(0)
 const zone=membership.gym?.time_zone||'Asia/Manila'
 const rows=(membership.activity||[]).filter(a=>historyContainsDay(dateInZone(zone,new Date(a.created_at)),range))
 const current=Math.min(page,Math.max(0,Math.ceil(rows.length/20)-1))
 return <section><h3>Team activity</h3><p className="gg-small">Management actions in your gym. The latest 200 actions are retained.</p><HistoryDateFilter label="Activity date" zone={zone} value={range} onChange={next=>{setRange(next);setPage(0)}}/><p className="gg-meta" role="status">{rows.length} matching {rows.length===1?'action':'actions'}</p>{!rows.length?<p className="gg-empty">{range.from||range.to?'No activity in this date range. Clear filters to see all retained activity.':'Management actions will appear here.'}</p>:<ol className="gg-activity">{rows.slice(current*20,current*20+20).map(a=><li key={a.id}><p><strong>{a.actor}</strong> {activityLabels[a.action]||'updated the gym'}{targetActions.has(a.action)?' '+a.target:''}.</p><time dateTime={a.created_at}>{new Intl.DateTimeFormat(undefined,{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(a.created_at))}</time></li>)}</ol>}<HistoryPagination page={current} total={rows.length} onChange={setPage} label="Team activity pages"/></section>
}
