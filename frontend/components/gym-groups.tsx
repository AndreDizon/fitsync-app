'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Building2, Check, Copy, Crown, LogOut, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users } from 'lucide-react'
import { usePlanAccount } from '@/lib/playlist-account'
import { useConfirmation } from './confirm-dialog'
import { GymCommunityTools } from './gym-community-tools'
import { gymRequest, type Gym, type GymMembership as Membership, type GymTab } from '@/lib/gym-groups'
import { GymGuidance } from './gym-management-tools'
import { HistoryPagination } from './gym-history-filter'
import '@/app/gym-groups.css'


export function GymGroupsCard({onOpen}:{onOpen:()=>void}){
  return <section className="sc-gyms-overview" aria-labelledby="sc-gyms-title">
    <header className="fitsync-card-heading"><Building2 size={22}/><div><h3 id="sc-gyms-title">Your gym, your team</h3><p>Create a gym community or join one to train together.</p></div><button type="button" data-view-section="gyms" onClick={onOpen}>Explore gyms<ArrowRight size={17}/></button></header>
    <div className="sc-gyms-intro"><div><Users size={20}/><strong>Join your people</strong><p>Find a gym by name or enter its join code.</p></div><div><Plus size={20}/><strong>Start your own gym</strong><p>Create a group and welcome up to 100 members.</p></div><div><ShieldCheck size={20}/><strong>Build your team</strong><p>The gym admin can assign staff and manage members.</p></div></div>
    <p className="sc-gyms-note">One gym community per account. Joining does not purchase a membership; gym staff manage plan records and fees.</p>
  </section>
}

export function GymGroups({onBack,initialTab,expectedGymId}:{onBack:()=>void;initialTab?:GymTab;expectedGymId?:string}){
  const owner=usePlanAccount(),confirm=useConfirmation()
  const [mine,setMine]=useState<Membership|null>(null),[gyms,setGyms]=useState<Gym[]>([]),[total,setTotal]=useState(0)
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0),[version,setVersion]=useState(0),[code,setCode]=useState('')
  const [name,setName]=useState(''),[description,setDescription]=useState(''),[copied,setCopied]=useState(false)
  const [welcome,setWelcome]=useState(''),[rules,setRules]=useState('')
  const [joinMode,setJoinMode]=useState<'open'|'approval'|'invite'>('open')
  const [timeZone,setTimeZone]=useState('Asia/Manila'),[timeZones,setTimeZones]=useState<string[]>(['Asia/Manila','UTC'])
  const [memberSearch,setMemberSearch]=useState(''),[memberRole,setMemberRole]=useState('all'),[memberPage,setMemberPage]=useState(0)
  const visibleMembers=(mine?.members||[]).filter(m=>m.username.toLowerCase().includes(memberSearch.trim().toLowerCase())&&(memberRole==='all'||m.role===memberRole))
  const currentMemberPage=Math.min(memberPage,Math.max(0,Math.ceil(visibleMembers.length/10)-1))
  const generation=useRef(0)
  useEffect(()=>{
    const supported=(Intl as typeof Intl & {supportedValuesOf?:(key:string)=>string[]}).supportedValuesOf?.('timeZone')||['Asia/Manila','UTC','Asia/Tokyo','Europe/London','America/New_York','Australia/Sydney']
    setTimeZones([...new Set([...supported,'Asia/Manila','UTC',timeZone])].sort())
  },[timeZone])
  useEffect(()=>{
    if(!owner){setLoading(false);return}
    const abort=new AbortController(),run=++generation.current
    const signal=AbortSignal.any([abort.signal,AbortSignal.timeout(30000)])
    setLoading(true);setError('')
    ;(async()=>{
      try{
        const membership:Membership=await gymRequest('mine',{},signal)
        if(run!==generation.current)return
        setMine(membership)
        if(membership.gym){setName(membership.gym.name);setDescription(membership.gym.description);setWelcome(membership.gym.welcome_message||'');setRules(membership.gym.rules||'');setJoinMode(membership.gym.join_mode||'open');setTimeZone(membership.gym.time_zone||'Asia/Manila')}
        else{const result=await gymRequest('list',{q:query,page},signal);if(run!==generation.current)return;setGyms(result.gyms);setTotal(result.total);if(page>0&&page*6>=result.total)setPage(Math.max(0,Math.ceil(result.total/6)-1))}
      }catch(e){if(!abort.signal.aborted&&run===generation.current)setError((e as Error).message)}
      finally{if(run===generation.current&&!abort.signal.aborted)setLoading(false)}
    })()
    return()=>{generation.current++;abort.abort()}
  },[owner,query,page,version])
  async function act(action:string,doc:Record<string,unknown>,success:string):Promise<boolean>{
    if(busy||!owner)return false
    const run=generation.current
    setBusy(true);setError('');setNotice('')
    try{const result:Membership=await gymRequest(action,doc);if(run!==generation.current)return false;setMine(result);if(!result.gym){setName('');setDescription('');setWelcome('');setRules('');setCode('')}setNotice(action==='join'&&result.pending?'Join request sent. The gym team will review it.':success);setCopied(false);setVersion(n=>n+1);window.dispatchEvent(new CustomEvent('fitsync-gym-updated',{detail:{owner}}));return true}
    catch(e){if(run===generation.current)setError((e as Error).message);return false}
    finally{setBusy(false)}
  }
  async function confirmAction(title:string,message:string,confirmLabel:string,action:string,doc:Record<string,unknown>,success:string,destructive=false){
    const run=generation.current
    if(await confirm({title,message,confirmLabel,destructive})&&run===generation.current)await act(action,doc,success)
  }
  const gym=mine?.gym,admin=mine?.role==='admin',locked=busy||loading
  const joiningOptions=<div className="gg-field"><label htmlFor="gym-join-mode">Who can join?</label><select id="gym-join-mode" value={joinMode} onChange={event=>setJoinMode(event.target.value as typeof joinMode)}><option value="open">Open — join immediately</option><option value="approval">Approval required — review requests</option><option value="invite">Invite only — join code needed</option></select></div>
  const timeZoneField=<div className="gg-field"><label htmlFor="gym-time-zone">Gym session time zone</label><select id="gym-time-zone" value={timeZone} onChange={event=>setTimeZone(event.target.value)} aria-describedby="gym-time-zone-help">{timeZones.map(zone=><option key={zone} value={zone}>{zone==='Asia/Manila'?'Asia/Manila — Philippine time (UTC+08:00)':zone.replaceAll('_',' ')}</option>)}</select><p id="gym-time-zone-help" className="gg-small">Use the gym’s local time for scheduling and viewing sessions. Existing sessions keep their scheduled moment if this changes.</p></div>
  return <section className="sc-gyms" aria-labelledby="gym-workspace-title">
    <button className="gg-back" type="button" onClick={onBack}><ArrowLeft size={17}/>Back to community</button>
    <header className="gg-heading"><div><h2 id="gym-workspace-title" tabIndex={-1}>{gym?gym.name:'Find your gym community'}</h2><p>{gym?`${admin?'Gym admin':mine?.role==='staff'?'Staff':'Gym member'} | ${mine?.members.length||0}/100 members | ${gym.time_zone||'Asia/Manila'}`:'Join a community or create a space for your own team.'}</p></div>{owner&&<button type="button" disabled={locked} onClick={()=>setVersion(n=>n+1)} aria-label="Refresh gyms"><RefreshCw size={17}/>{loading?'Loading…':'Refresh'}</button>}</header>
    {!owner?<p className="gg-feedback">Sign in to create or join a gym. Local tester previews cannot create real memberships.</p>:<>
      {error&&<div className="gg-feedback gg-error" role="alert">{error}<button type="button" disabled={busy} onClick={()=>setVersion(n=>n+1)}>Try again</button></div>}
      {notice&&<p className="gg-feedback gg-success" role="status">{notice}</p>}
      {loading&&<p className="gg-feedback" role="status">Loading gym information…</p>}
      {!loading&&expectedGymId&&expectedGymId!==gym?.id&&<p className="gg-feedback">This notification is for a gym you no longer belong to, or a join request that has ended. Your current gym information is shown below.</p>}
      {gym?<>

        <GymCommunityTools key={gym.id} membership={mine} owner={owner} locked={locked} onAction={act} settings={<section className="gg-settings-content"><h3>{admin?'Gym settings':'Gym information & rules'}</h3><p className="gg-small">{admin?'Manage the welcome message, rules, joining policy and local time.':'Read the welcome message, rules and joining information for your gym.'}</p>
          <div className="gg-code"><div><span>Join code</span><strong>{gym.join_code}</strong></div><button type="button" disabled={locked} onClick={async()=>{try{await navigator.clipboard.writeText(gym.join_code||'');setCopied(true)}catch{setError('Copy is unavailable. Select the join code and copy it manually.')}}}>{copied?<Check size={16}/>:<Copy size={16}/>}<span>{copied?'Copied':'Copy code'}</span></button></div>
          <p className="gg-small">{gym.join_mode==='approval'?'Approval required. Staff or admin review every request, including requests made with a code.':gym.join_mode==='invite'?'Invite only. This gym is hidden from search; anyone with its code can join unless banned.':'Open gym. Anyone signed in can join unless banned.'} Staff is a community role, not a professional qualification.</p>
          {admin?<section className="gg-edit"><h4>Edit gym details</h4><form onSubmit={event=>{event.preventDefault();void act('update_settings',{name,welcomeMessage:welcome,rules,joinMode,timeZone},'Gym details saved.')}}><fieldset disabled={locked}><label>Gym name<input required minLength={3} maxLength={60} value={name} onChange={event=>setName(event.target.value)}/></label><label>Welcome message<textarea aria-label="Welcome message" maxLength={1000} value={welcome} onChange={event=>setWelcome(event.target.value)} placeholder="Welcome your team and explain how to get started."/></label><label>Gym rules<textarea aria-label="Gym rules" maxLength={4000} value={rules} onChange={event=>setRules(event.target.value)} placeholder="Share expectations for conduct, equipment and training together."/></label>{joiningOptions}{timeZoneField}<p className="gg-small">Changing the joining option clears pending requests. Applicants can request again under the new policy.</p><button className="gg-primary" type="submit">Save gym details</button></fieldset></form></section>:null}
        <GymGuidance membership={mine}/>
        <details className="gg-admin-details"><summary>{admin?'Ownership & gym deletion':'Leave this gym'}</summary>        <div className="gg-exit">{admin?<><p>You can transfer ownership from Team before leaving. Deleting the gym removes its shared content, income records and all memberships.</p><button type="button" className="gg-danger" disabled={locked} onClick={()=>void confirmAction('Delete this gym?',`Delete ${gym.name}, its shared content, all income records and all ${mine.members.length} memberships? Personal FitSync accounts and records stay intact.`,'Delete gym','disband',{},'Gym deleted.',true)}><Trash2 size={16}/>Delete gym</button></>:<button type="button" disabled={locked} onClick={()=>void confirmAction('Leave this gym?',`Leave ${gym.name}? Your personal FitSync plans and records stay intact.`,'Leave gym','leave',{},'You left the gym.')}><LogOut size={16}/>Leave gym</button>}</div></details>
        </section>} initialTab={!expectedGymId||expectedGymId===gym.id?initialTab:undefined}>
        <section className="gg-roster" aria-labelledby="gym-roster-title"><header><h3 id="gym-roster-title">Members</h3><p>{admin?'Assign staff, manage members or transfer ownership.':'Staff review requests, manage announcements and organize sessions. Only the admin manages roles.'}</p></header><div className="gg-roster-filters"><div className="gg-field"><label htmlFor="gym-member-search">Search members</label><input id="gym-member-search" type="search" maxLength={100} value={memberSearch} onChange={e=>{setMemberSearch(e.target.value);setMemberPage(0)}}/></div><div className="gg-field"><label htmlFor="gym-member-role">Role</label><select id="gym-member-role" value={memberRole} onChange={e=>{setMemberRole(e.target.value);setMemberPage(0)}}><option value="all">All roles</option><option value="admin">Gym admin</option><option value="staff">Staff</option><option value="member">Gym member</option></select></div></div><p className="gg-meta">{visibleMembers.length} matching {visibleMembers.length===1?'member':'members'}</p>{!visibleMembers.length&&<p className="gg-empty">No members match these filters.</p>}<ul>{visibleMembers.slice(currentMemberPage*10,currentMemberPage*10+10).map(member=><li key={member.user_id}><span className="gg-member-avatar" aria-hidden="true">{member.username.slice(0,2).toUpperCase()}</span><div className="gg-member-name"><strong>{member.username}{member.user_id===owner?' (you)':''}</strong><span className="gg-member-role">{member.role==='admin'?<><Crown size={13}/>Gym admin</>:member.role==='staff'?'Staff':'Gym member'}</span></div>{admin&&member.role!=='admin'&&<div className="gg-member-actions"><button type="button" disabled={locked} onClick={()=>void confirmAction(member.role==='staff'?'Change to gym member?':'Promote to staff?',`${member.username} will become ${member.role==='staff'?'a gym member':'staff'}. Staff can review requests, manage announcements and sessions, and moderate discussion.`,member.role==='staff'?'Make member':'Make staff','role',{userId:member.user_id,role:member.role==='staff'?'member':'staff'},'Member role updated.')}>{member.role==='staff'?'Make member':'Make staff'}</button><details className="gg-member-more"><summary>More actions</summary><button type="button" disabled={locked} onClick={()=>void confirmAction('Transfer gym ownership?',`${member.username} will become the only gym admin. You will become staff and lose admin controls.`,'Transfer ownership','transfer',{userId:member.user_id},'Gym ownership transferred.')}>Make admin</button><button type="button" className="gg-danger" disabled={locked} onClick={()=>void confirmAction('Remove member?',`Remove ${member.username}? They can request or join again under the gym’s joining policy.`,'Remove member','remove',{userId:member.user_id},'Member removed.',true)}>Remove</button><button type="button" className="gg-danger" disabled={locked} onClick={()=>void confirmAction('Ban member?',`Remove ${member.username} and block them from rejoining, including by code? Only the admin can lift this ban.`,'Ban member','ban',{userId:member.user_id},'Member banned.',true)}>Ban</button></details></div>}</li>)}</ul><HistoryPagination page={currentMemberPage} total={visibleMembers.length} pageSize={10} previousLabel="Previous" nextLabel="Next" onChange={setMemberPage} label="Gym member pages"/></section>
        </GymCommunityTools>
      </>:!loading&&mine?<>
        {mine.pending&&<div className="gg-feedback gg-pending" role="status"><div><strong>Waiting for {mine.pending.name}</strong><p>Your join request is with the gym team. You can cancel it below.</p></div><button type="button" disabled={locked} onClick={()=>void act('cancel_request',{},'Join request cancelled.')}>Cancel request</button></div>}
        <div className="gg-entry"><form onSubmit={event=>{event.preventDefault();void act('join',{code:code.trim()},'You joined the gym.')}}><h3>Have a join code?</h3><fieldset disabled={locked}><label htmlFor="gym-join-code">Gym code<input id="gym-join-code" required minLength={10} maxLength={10} autoCapitalize="characters" spellCheck={false} value={code} onChange={event=>setCode(event.target.value.toUpperCase())} placeholder="10-character code"/></label><button className="gg-primary" type="submit">Join gym</button></fieldset></form>
          <details className="gg-create"><summary><Plus size={17}/>Create a gym</summary><form onSubmit={event=>{event.preventDefault();void act('create',{name,description,joinMode,timeZone},'Your gym is ready. You are the gym admin.')}}><fieldset disabled={locked}><label>Gym name<input required minLength={3} maxLength={60} value={name} onChange={event=>setName(event.target.value)} placeholder="Your team’s name"/></label><label>Description<textarea maxLength={400} value={description} onChange={event=>setDescription(event.target.value)} placeholder="Tell members what your gym is about"/></label>{joiningOptions}{timeZoneField}<p className="gg-small">One gym per account, up to 100 members. You become the admin. Creating a gym cancels your pending join request.</p><button className="gg-primary" type="submit">Create gym</button></fieldset></form></details></div>
        <form className="gg-search" onSubmit={event=>{event.preventDefault();setQuery(search.trim());setPage(0)}}><label htmlFor="gym-search">Find a gym by name</label><div><input id="gym-search" type="search" maxLength={100} value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search gym communities"/><button type="submit" disabled={locked}><Search size={17}/>Search</button></div></form>
        <p className="gg-small" role="status">{total?`${total} gym ${total===1?'community':'communities'}`:'No gyms found. Create the first one or try a different name.'}</p>
        <div className="gg-directory">{gyms.map(item=><article key={item.id}><Building2 size={23}/><h3>{item.name}</h3><p>{item.description||'A FitSync gym community. Join to meet the team.'}</p><span className="gg-small">{item.join_mode==='approval'?'Approval required':'Open joining'}</span><footer><span>{item.member_count}/100 members</span><button type="button" className="gg-primary" disabled={locked||(item.member_count||0)>=100||!!mine.pending} onClick={()=>void act('join',{gymId:item.id},'You joined the gym.')}>{(item.member_count||0)>=100?'Full':mine.pending?.gym_id===item.id?'Requested':item.join_mode==='approval'?'Request to join':'Join gym'}</button></footer></article>)}</div>
        {total>6&&<nav className="gg-pagination" aria-label="Gym pages"><button disabled={locked||page===0} onClick={()=>setPage(n=>n-1)}>Previous</button><span>Page {page+1} of {Math.ceil(total/6)}</span><button disabled={locked||(page+1)*6>=total} onClick={()=>setPage(n=>n+1)}>Next</button></nav>}
      </>:null}
    </>}
    <p className="gg-small gg-disclaimer">Gym groups are user-created communities. FitSync does not verify business ownership or professional credentials. Membership does not share private progress photos, nutrition logs, email addresses or payment details.</p>
  </section>
}
