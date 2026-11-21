'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CalendarDays, ClipboardList, MessageCircle, Pin, Plus, Settings2, Users } from 'lucide-react'
import { gymRequest, gymTimeZoneLabel, type GymAction, type GymAnnouncement, type GymMembership, type GymTab } from '@/lib/gym-groups'
import { GymAttendance, GymMembershipPlans } from './gym-management-tools'
import { GymIncome } from './gym-income'
import { listPlaylists, savePlaylist } from '@/lib/playlists'
import { parsePlaylist, type Playlist } from '../../shared/playlists'
import { useConfirmation } from './confirm-dialog'
import '@/app/gym-community-tools.css'

const date=(value:string)=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})
const activityLabels:Record<string,string>={guidance:'updated the welcome message and rules',save_plan:'saved a membership plan',archive_plan:'changed plan availability',assign_plan:'recorded a membership for',cancel_period:'cancelled a membership record for',mark_attendance:'updated attendance for',approve:'approved a join request for',reject:'declined a join request from',leave:'left the gym',role_staff:'promoted to staff:',role_member:'changed to member:',transfer:'transferred ownership to',remove:'removed',ban:'banned',unban:'lifted the ban for',update:'updated gym settings',announce:'posted an announcement',edit_announcement:'edited an announcement',pin:'changed a pinned announcement',delete_announcement:'removed an announcement',delete_message:'removed a discussion message',schedule:'scheduled a training session',cancel_session:'cancelled a session',share_playlist:'shared a workout playlist',unshare_playlist:'removed a shared playlist'}
const targetActions=new Set(['approve','reject','role_staff','role_member','transfer','remove','ban','unban','assign_plan','cancel_period','mark_attendance'])
type Props={membership:GymMembership;owner:string;locked:boolean;onAction:GymAction;children:ReactNode;initialTab?:GymTab}

export function GymCommunityTools({membership,owner,locked,onAction,children,initialTab}:Props){
 const manager=membership.role==='admin'||membership.role==='staff',admin=membership.role==='admin'
 const [tab,setTab]=useState<string>(initialTab||'announcements')
 const confirm=useConfirmation()
 const groups=[
  {id:'community',label:'Community',Icon:MessageCircle,tabs:[{id:'announcements',label:'Announcements'},{id:'discussion',label:'Discussion'}]},
  {id:'training',label:'Training',Icon:CalendarDays,tabs:[{id:'sessions',label:'Sessions'},{id:'attendance',label:'Attendance'},{id:'playlists',label:'Playlists'}]},
  {id:'members',label:'Members',Icon:Users,tabs:[{id:'team',label:'Team'},{id:'membership',label:'Membership'}]},
  {id:'management',label:'Management',Icon:Settings2,tabs:[...(admin?[{id:'income',label:'Income'}]:[]),...(manager?[{id:'activity',label:'Activity'}]:[])]},
 ].filter(group=>group.tabs.length)
 const active=groups.some(group=>group.tabs.some(item=>item.id===tab))?tab:'announcements'
 const area=groups.find(group=>group.tabs.some(item=>item.id===active))!
 const remembered=useRef<Record<string,string>>({})
 useEffect(()=>{remembered.current[area.id]=active},[area.id,active])
 function openSection(id:string){const group=groups.find(group=>group.tabs.some(item=>item.id===id));if(group)remembered.current[group.id]=id;setTab(id)}
 function openArea(id:string){const group=groups.find(item=>item.id===id)!;const previous=remembered.current[id];openSection(group.tabs.some(item=>item.id===previous)?previous:group.tabs[0].id)}
 function arrowNavigation(event:React.KeyboardEvent<HTMLElement>){
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
  const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button')),index=buttons.indexOf(event.target as HTMLButtonElement)
  if(index<0)return
  event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length
  buttons[next]?.focus();buttons[next]?.click()
 }
 async function removeBan(userId:string,username:string){if(await confirm({title:'Lift this ban?',message:`${username} will be able to join or request membership again.`,confirmLabel:'Lift ban'}))await onAction('unban',{userId},'Ban lifted.')}
 return <div className="gg-tools">
  <nav className="gg-area-nav" aria-label="Gym areas" data-group-count={groups.length} onKeyDown={arrowNavigation}>{groups.map(group=><button type="button" key={group.id} aria-pressed={area.id===group.id} aria-controls="gym-section-navigation" onClick={()=>openArea(group.id)}><group.Icon size={18}/><span>{group.label}</span>{group.id==='members'&&manager&&!!membership.requests?.length&&<span className="gg-tab-count" aria-label={`${membership.requests.length} pending join requests`}>{membership.requests.length}</span>}</button>)}</nav>
  <nav id="gym-section-navigation" className="gg-tabs" aria-label="Gym sections" onKeyDown={arrowNavigation}><span className="gg-area-label">{area.label}</span>{area.tabs.map(t=><button key={t.id} id={'gym-nav-'+t.id} type="button" aria-pressed={active===t.id} aria-controls="gym-community-panel" onClick={()=>openSection(t.id)}>{t.label}{t.id==='team'&&manager&&!!membership.requests?.length&&<span className="gg-tab-count">{membership.requests.length}</span>}</button>)}</nav>
  <div id="gym-community-panel" role="region" aria-labelledby={'gym-nav-'+active} className="gg-panel">
   {active==='announcements'&&<Announcements announcements={membership.announcements||[]} manager={manager} locked={locked} onAction={onAction}/>}
   {active==='discussion'&&<Discussion key={membership.gym!.id} membership={membership} owner={owner} manager={manager} locked={locked} onAction={onAction}/>}
   {active==='sessions'&&<Sessions membership={membership} manager={manager} locked={locked} onAction={onAction}/>}
   {active==='attendance'&&<GymAttendance membership={membership} locked={locked} onAction={onAction}/>}
   {active==='membership'&&<GymMembershipPlans membership={membership} owner={owner} locked={locked} onAction={onAction}/>}
   {active==='income'&&admin&&<GymIncome membership={membership} locked={locked}/>}
   {active==='playlists'&&<SharedPlaylists membership={membership} owner={owner} manager={manager} locked={locked} onAction={onAction}/>}
   {active==='team'&&<>
    {manager&&<section className="gg-requests"><h3>Join requests <span className="gg-inline-count">{membership.requests?.length||0}</span></h3><p className="gg-small">Approve people you want on the team. Requests do not reserve a place.</p>{!membership.requests?.length?<p className="gg-empty">No requests waiting.</p>:<ul className="gg-plain-list">{membership.requests.map(r=><li key={r.user_id}><div><strong>{r.username}</strong><span className="gg-meta">Requested {date(r.created_at)}</span></div><div className="gg-actions"><button className="gg-primary" type="button" disabled={locked||membership.members.length>=100} onClick={()=>void onAction('approve',{userId:r.user_id},'Member approved.')}>Approve</button><button type="button" disabled={locked} onClick={async()=>{if(await confirm({title:'Decline join request?',message:`Decline ${r.username}’s request? They can request again.`,confirmLabel:'Decline request'}))await onAction('reject',{userId:r.user_id},'Request declined.')}}>Decline</button></div></li>)}</ul>}</section>}
    {children}
    {admin&&<details className="gg-admin-details"><summary>Banned members ({membership.bans?.length||0})</summary>{!membership.bans?.length?<p className="gg-empty">No banned members.</p>:<ul className="gg-plain-list">{membership.bans.map(b=><li key={b.user_id}><strong>{b.username}</strong><button type="button" disabled={locked} onClick={()=>void removeBan(b.user_id,b.username)}>Lift ban</button></li>)}</ul>}</details>}
   </>}
   {active==='activity'&&manager&&<section><h3>Team activity</h3><p className="gg-small">The latest 200 management actions. Only the admin and staff can see this history.</p>{!membership.activity?.length?<p className="gg-empty">Management actions will appear here.</p>:<ol className="gg-activity">{membership.activity.map(a=><li key={a.id}><p><strong>{a.actor}</strong> {activityLabels[a.action]||'updated the gym'}{targetActions.has(a.action)?' '+a.target:''}.</p><time dateTime={a.created_at}>{date(a.created_at)}</time></li>)}</ol>}</section>}
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

type Message={id:string;body:string;author_id:string|null;username:string;created_at:string}
function Discussion({membership,owner,manager,locked,onAction}:{membership:GymMembership;owner:string;manager:boolean;locked:boolean;onAction:GymAction}){
 const [messages,setMessages]=useState<Message[]>([]),[page,setPage]=useState(0),[total,setTotal]=useState(0),[body,setBody]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0)
 const confirm=useConfirmation()
 useEffect(()=>{
  const abort=new AbortController();setLoading(true);setError('')
  gymRequest('discussion',{page},AbortSignal.any([abort.signal,AbortSignal.timeout(30000)])).then(r=>{if(!abort.signal.aborted){setMessages(r.messages);setTotal(r.total);if(page>0&&page*30>=r.total)setPage(Math.max(0,Math.ceil(r.total/30)-1))}}).catch(e=>{if(!abort.signal.aborted)setError(e.message)}).finally(()=>{if(!abort.signal.aborted)setLoading(false)})
  return()=>abort.abort()
 },[membership,page,retry])
 return <section><h3>Team discussion</h3><p className="gg-small">Only gym members can read this board. Share a question, update or encouragement.</p>
  <form className="gg-compose" onSubmit={async event=>{event.preventDefault();if(await onAction('message',{body},'Message posted.')){setBody('');setPage(0)}}}><fieldset disabled={locked}><label>Message to your gym<textarea required maxLength={2000} value={body} onChange={e=>setBody(e.target.value)} placeholder="What would you like to share?"/></label><button className="gg-primary" type="submit">Post message</button></fieldset></form>
  {loading&&<p role="status" className="gg-empty">Loading discussion…</p>}{error&&<p role="alert" className="gg-feedback gg-error">{error} <button type="button" onClick={()=>setRetry(n=>n+1)}>Retry discussion</button></p>}
  {!loading&&!error&&(!messages.length?<p className="gg-empty">Start your gym’s first conversation.</p>:<div className="gg-posts">{messages.map(a=><article className="gg-post" key={a.id}><p className="gg-meta"><strong>{a.username}</strong> · <time dateTime={a.created_at}>{date(a.created_at)}</time></p><p className="gg-post-body">{a.body}</p>{(manager||a.author_id===owner)&&<button className="gg-danger" type="button" disabled={locked} onClick={async()=>{if(await confirm({title:'Delete message?',message:'Remove this message from the gym discussion?',confirmLabel:'Delete message',destructive:true}))await onAction('delete_message',{id:a.id},'Message removed.')}}>Delete message</button>}</article>)}</div>)}
  {total>30&&<nav className="gg-pagination" aria-label="Discussion pages"><button type="button" disabled={loading||locked||page===0} onClick={()=>setPage(n=>n-1)}>Newer</button><span>Page {page+1} of {Math.ceil(total/30)}</span><button type="button" disabled={loading||locked||(page+1)*30>=total} onClick={()=>setPage(n=>n+1)}>Older</button></nav>}
 </section>
}

function Sessions({membership,manager,locked,onAction}:{membership:GymMembership;manager:boolean;locked:boolean;onAction:GymAction}){
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

function SharedPlaylists({membership,owner,manager,locked,onAction}:{membership:GymMembership;owner:string;manager:boolean;locked:boolean;onAction:GymAction}){
 const [saved,setSaved]=useState<Playlist[]>([]),[selected,setSelected]=useState(''),[loading,setLoading]=useState(false),[importing,setImporting]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[showShare,setShowShare]=useState(false)
 const confirm=useConfirmation(),alive=useRef(true),items=membership.playlists||[]
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 async function loadSaved(){
  setLoading(true);setError('')
  try{const result=await listPlaylists('workout');if(alive.current){setSaved(result.filter(p=>p.items.length>0));setShowShare(true)}}catch(e){if(alive.current)setError((e as Error).message)}finally{if(alive.current)setLoading(false)}
 }
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
