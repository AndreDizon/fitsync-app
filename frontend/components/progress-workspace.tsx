'use client'
import { heroImage } from '@/lib/hero-images'
import { HeroImagePreloads } from '@/components/hero-asset-loading'
import { ActionNotice } from './action-notice'
import { SyncStatus } from './sync-status'
import { ProgressPhotoTimeline } from './progress-photo-timeline'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Camera, ChartNoAxesCombined, NotebookPen, Flame, LockKeyhole, Plus, Target, Trophy, X } from 'lucide-react'
import { cachedWeek } from '@/lib/daily-plans'
import { journalPeriod } from '../../shared/progress-journal'
import { JournalHeaderArt } from '@/components/journal-header-art'
import { ProgressAchievements } from '@/components/progress-achievements'
import { ProgressRecords } from '@/components/progress-records'
import { ProgressAnalytics } from '@/components/progress-analytics'
import { HeroDetail } from '@/components/hero-detail'
import { usePlanningProfile } from '@/lib/planning-profile'
import { usePlanAccount } from '@/lib/playlist-account'
import { devicePlanWeeks, pendingVisits, loadAppStreak, loadProgress, preparePhoto, progressRequest, type ProgressSnapshot } from '@/lib/progress'
import { dateInZone, habitStats, measurementFields, achievementStats, weightForecast, type ProgressEntry, type ProgressKind } from '../../shared/progress'
import { type PlanWeek } from '../../shared/daily-plans'
import '@/app/progress.css'

const shortDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))
const fieldNames: Record<string, string> = { weightKg: 'Weight (kg)', bodyFat: 'Body fat (%)', chest: 'Chest (cm)', waist: 'Waist (cm)', hips: 'Hips (cm)', arm: 'Arm (cm)', thigh: 'Thigh (cm)', rpe: 'Workout effort / RPE (1–10)', energy: 'Energy', mood: 'Mood', sleepQuality: 'Sleep quality', soreness: 'Soreness', sleepHours: 'Sleep duration (hours)' }
export function ProgressWorkspace({ initialTab = 'analytics', userName = '' }: { initialTab?: 'analytics' | 'documentation' | 'achievements'; userName?: string }) {
  const owner = usePlanAccount(), profile = usePlanningProfile(), zone = profile?.timeZone || 'Asia/Manila'
  const [clock,setClock] = useState(()=>new Date()), today = dateInZone(zone,clock), lastDate = useRef(today)
  const [snapshot,setSnapshot] = useState<ProgressSnapshot|null>(null), [error,setError] = useState(''), [notice,setNotice] = useState(''), [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [version,setVersion] = useState(0)
  const [appStreak,setAppStreak] = useState<number|null>(null), [streakUnavailable,setStreakUnavailable] = useState(false)
  const [tab,setTab] = useState<string>(initialTab)
  const [editor,setEditor] = useState<{kind:ProgressKind;entry?:ProgressEntry}|null>(null), [entryId,setEntryId] = useState(''), [form,setForm] = useState<Record<string,string>>({}), [photo,setPhoto] = useState<File|null>(null), [formError,setFormError] = useState('')
  const [analyticsRange,setAnalyticsRange] = useState(28), [documentationRange,setDocumentationRange] = useState(84)
  const dialog = useRef<HTMLDialogElement>(null), generation = useRef(0), previousFocus = useRef<HTMLElement|null>(null)
  useEffect(()=>{const timer=setInterval(()=>setClock(new Date()),60000);return()=>clearInterval(timer)},[])
  useEffect(()=>{if(lastDate.current!==today){lastDate.current=today;setVersion(n=>n+1)}},[today])
  useEffect(()=>{let active=true;setLoading(true);setError('');if(!owner){setSnapshot(null);setLoading(false);return}loadProgress(owner).then(data=>{if(active)setSnapshot(data)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[owner,version])
  useEffect(()=>{let active=true;if(!owner){setAppStreak(0);setStreakUnavailable(false);return}const updateStreak=()=>{void loadAppStreak(owner,zone).then(value=>{if(active){setAppStreak(value);setStreakUnavailable(false)}}).catch(()=>{if(active){setAppStreak(null);setStreakUnavailable(true)}})};const updateWhenVisible=()=>{if(document.visibilityState==='visible')updateStreak()};updateStreak();const timer=setInterval(updateStreak,5*60_000);document.addEventListener('visibilitychange',updateWhenVisible);return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',updateWhenVisible)}},[owner,zone])
  useEffect(()=>{const online=()=>setVersion(n=>n+1);window.addEventListener('online',online);return()=>window.removeEventListener('online',online)},[])
  useEffect(()=>{generation.current++;setBusy(false);setEditor(null);setSnapshot(null);return()=>{generation.current++}},[owner])
  useEffect(()=>{if(editor){dialog.current?.showModal()}else if(dialog.current?.open){dialog.current.close();previousFocus.current?.focus()}},[editor])
  const entries = snapshot?.entries || []
  const weeks = useMemo(()=>{const merged=new Map<string,PlanWeek>();for(const week of snapshot?.weeks||[])merged.set(week.week,week);if(owner)for(const week of devicePlanWeeks(owner))merged.set(week.week,week);return [...merged.values()]},[snapshot,owner])
  const stats = useMemo(()=>habitStats(weeks,[...(snapshot?.visits||[]),...(owner?pendingVisits(owner):[])],today),[weeks,snapshot,owner,today]), target = Number(profile?.targetWeightKg)||null, forecast = weightForecast(journalPeriod(entries,today,analyticsRange),target,Number(profile?.age),today)
  const body = journalPeriod(entries,today,analyticsRange).filter(e=>e.kind==='body').sort((a,b)=>b.date.localeCompare(a.date)||(b.created_at||'').localeCompare(a.created_at||'')), lastWeight = body.find(e=>typeof e.payload.weightKg==='number'), baseline = [...body].reverse().find(e=>typeof e.payload.weightKg==='number')
  const weight = lastWeight?.payload.weightKg ?? null, delta = lastWeight&&baseline&&lastWeight.date!==baseline.date ? lastWeight.payload.weightKg!-baseline.payload.weightKg! : null
  const photos=journalPeriod(entries,today,documentationRange).filter(e=>e.kind==='photo').sort((a,b)=>a.date.localeCompare(b.date)||(a.created_at||'').localeCompare(b.created_at||''))
  const earned=new Set(snapshot?.awards.map(a=>a.code)||[])
  function openEditor(kind:ProgressKind,entry?:ProgressEntry){previousFocus.current=document.activeElement as HTMLElement;setEntryId(entry?.id||crypto.randomUUID());setForm(entry?{date:entry.date,...Object.fromEntries(Object.entries(entry.payload).filter(([key])=>key!=='path').map(([key,value])=>[key,String(value)]))}:{date:today});setPhoto(null);setFormError('');setEditor({kind,entry})}
  async function submit(event:React.FormEvent){event.preventDefault();if(!owner||!editor)return;if(editor.kind!=='photo'&&!Object.entries(form).some(([key,value])=>key!=='date'&&key!=='notes'&&value.trim()!=='')){setFormError(editor.kind==='body'?'Enter at least one measurement before saving. Other fields can stay blank.':'Choose at least one check-in rating or enter your sleep duration before saving.');return}if(!navigator.onLine){setFormError('Reconnect to save journal entries or photos to your account. Your form stays open.');return}const run=generation.current;setBusy(true);setFormError('');try{
    let response
    if(editor.kind==='photo'&&!editor.entry){if(!photo)throw new Error('Choose a photo first.');const payload=new FormData();const image=await preparePhoto(photo);if(run!==generation.current)return;payload.set('file',image,'progress.jpg');payload.set('date',form.date);payload.set('notes',form.notes||'');response=await progressRequest('/photo','POST',payload)}
    else{const payload:Record<string,string|number>={};for(const [key,value]of Object.entries(form)){if(key==='date'||value==='')continue;payload[key]=key==='notes'?value:Number(value)}response=await progressRequest('',editor.entry?'PUT':'POST',{id:entryId,kind:editor.kind,date:form.date,payload,revision:editor.entry?.revision||0})}
    if(run!==generation.current)return;if(response.userId!==owner)throw new Error('Account changed. Reload this page.');setEditor(null);setNotice('Progress entry saved to your account.');setVersion(n=>n+1)
  }catch(e){if(run===generation.current)setFormError((e as Error).message)}finally{if(run===generation.current)setBusy(false)}}
  async function syncSavedProgress(){
    if(!owner)return 'This local preview has no connected account progress to refresh.'
    const run=generation.current
    const result=await loadProgress(owner)
    if(run!==generation.current||result.userId!==owner)throw new Error('Account changed. Reload before syncing.')
    setSnapshot(result)
    if(result.offline)throw new Error('Live sync is unavailable. Your device copies are kept. Reconnect and try again.')
    if(result.awardWarning)throw new Error(result.awardWarning)
    const unsynced=devicePlanWeeks(owner).map(week=>cachedWeek(owner,week.week)).find(week=>week.pending||week.conflict||week.error)
    if(unsynced)throw new Error(unsynced.error||'Some plan changes need attention in My Plan. Your device copies are kept.')
    setError('')
    return 'Your saved records, plans and achievements are up to date.'
  }
  const localSyncRecords=owner?devicePlanWeeks(owner).map(week=>cachedWeek(owner,week.week)):[]
  const localSyncProblem=localSyncRecords.find(week=>week.error||week.conflict)
  const progressPending=!!owner&&(pendingVisits(owner).length>0||localSyncRecords.some(week=>week.pending))
  const progressStatus=(label:string)=><SyncStatus key={owner||'local'} label={label} signedIn={!!owner} working={loading||busy} problem={!!owner&&!!(error||snapshot?.offline||snapshot?.awardWarning||localSyncProblem)} pending={progressPending} message={!owner?'You are viewing a local preview.':error||snapshot?.awardWarning||localSyncProblem?.error||(localSyncProblem?.conflict?'A plan has a sync conflict. Resolve it in My Plan; your saved edits are kept.':'')||(snapshot?.offline?'You are viewing a saved copy. Live sync is unavailable.':progressPending?'Saved activity changes are waiting to sync. Your device copies are kept.':'Your saved records are up to date. Sync now checks for changes and renews private photo access.')} onRefresh={syncSavedProgress} infoOnly={label==='Analytics information'} onSync={syncSavedProgress}/>
  async function claimAchievement(code:string){
    if(!owner||snapshot?.offline)throw new Error('Reconnect and sign in to claim this achievement.')
    const run=generation.current
    let result
    try{result=await progressRequest('','POST',{action:'claim',code})}catch(error){if(run===generation.current)setError((error as Error).message);throw error}
    if(run!==generation.current||result.userId!==owner)throw new Error('Account changed. Reload before continuing.')
    setError('')
    setSnapshot(current=>current?{...current,awards:current.awards.map(award=>award.code===code?result.data:award)}:current)
    window.dispatchEvent(new CustomEvent('fitsync-award-claimed',{detail:code}))
    return result.data
  }
  async function remove(entry:ProgressEntry){if(!owner||!window.confirm('Delete this progress entry'+(entry.kind==='photo'?' and its photo':'')+'?'))return;setBusy(true);setError('');const run=generation.current;try{const result=await progressRequest('?id='+entry.id+'&revision='+entry.revision,'DELETE');if(run!==generation.current)return;if(result.userId!==owner)throw new Error('Account changed. Reload this page.');setNotice(result.warning||'Progress entry deleted.');setVersion(n=>n+1)}catch(e){if(run===generation.current)setError((e as Error).message)}finally{if(run===generation.current)setBusy(false)}}
  return <div className="page progress-workspace"><HeroImagePreloads page="progress" />
    <div className="pr-hero-frame">
    <header className="pr-hero">
      <img className="hero-card-art progress-card-art" {...heroImage('hero-progress-document')} alt="" aria-hidden="true" />
      <svg className="pr-hero-line-art" viewBox="0 0 360 240" preserveAspectRatio="none" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M24 190H338M34 198V28" /><path d="M48 166c28-2 33-37 60-37s34 22 58 22 28-58 55-58 29 27 49 27 29-34 53-42" /><path d="M48 176c28-2 33-37 60-37s34 22 58 22 28-58 55-58 29 27 49 27 29-34 53-42" opacity=".45" /><circle cx="108" cy="129" r="5" /><circle cx="176" cy="151" r="5" /><circle cx="221" cy="93" r="5" /><circle cx="270" cy="120" r="5" /><circle cx="323" cy="78" r="5" /></g></svg>
      <HeroDetail variant="progress" /><div className="pr-hero-copy"><p className="pr-eyebrow">YOUR JOURNEY, IN YOUR NUMBERS</p><h1>Small steps.<br/><span className="plan-title-highlight">Visible progress.</span></h1><p>Your habits, measurements and personal milestones in one place.</p></div>
      <div className="pr-hero-mascot"><img {...heroImage('fox-progress')} alt="FitSync fox reviewing progress on a clipboard" width="768" height="768" /></div>
      <aside className="pr-streak-card"><Flame size={29}/><strong>{appStreak ?? '—'}<small>{streakUnavailable?'streak unavailable':'day app streak'}</small></strong><p>Best recorded streak: {stats.best} days</p></aside>
    </header>
    {error&&<p className="pr-error" role="alert">{error}</p>}{notice&&<ActionNotice message={notice} onClose={()=>setNotice('')}/>}{snapshot?.offline&&<p className="pr-status">Saved snapshot; live sync is unavailable. Plan totals include available device edits. Journal writes and private photo access need a connection.</p>}{snapshot?.limited&&<p className="pr-status">Showing the latest 1,000 records per history type. Totals and projections cover this loaded history.</p>}{snapshot?.awardWarning&&<p className="pr-status">{snapshot.awardWarning}</p>}
    <nav className="pr-tabs-bar" aria-label="Progress navigation"><div role="tablist" aria-label="Progress sections">{[['analytics','Analytics'],['documentation','Documentation'],['achievements','Achievements']].map(([id,label],index)=><button key={id} type="button" role="tab" id={'pr-tab-'+id} aria-selected={tab===id} aria-controls={'pr-panel-'+id} tabIndex={tab===id?0:-1} onClick={()=>setTab(id)} onKeyDown={event=>{const ids=['analytics','documentation','achievements'];const next=event.key==='ArrowRight'?(index+1)%3:event.key==='ArrowLeft'?(index+2)%3:event.key==='Home'?0:event.key==='End'?2:null;if(next!==null){event.preventDefault();setTab(ids[next]);document.getElementById('pr-tab-'+ids[next])?.focus()}}}>{id === 'analytics' ? <ChartNoAxesCombined size={17} aria-hidden="true"/> : id === 'documentation' ? <NotebookPen size={17} aria-hidden="true"/> : <Trophy size={17} aria-hidden="true"/>}<span>{label}</span></button>)}</div></nav>
    </div>
    <div role="tabpanel" id="pr-panel-analytics" aria-labelledby="pr-tab-analytics" hidden={tab!=='analytics'} tabIndex={0}>
    <ProgressAnalytics entries={entries} statusControl={progressStatus('Analytics information')} weeks={weeks} visits={[...(snapshot?.visits||[]),...(owner?pendingVisits(owner):[])]} profile={profile} today={today} loading={loading} period={analyticsRange} onPeriodChange={setAnalyticsRange} weight={weight} delta={delta}/>
    {forecast.date?<section className="pr-forecast-group" aria-label="Goal outlook"><article className="pr-projection"><Target size={28}/><p className="pr-eyebrow">IF YOUR RECENT TREND CONTINUES</p><h3>{'Around '+new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(forecast.date+'T12:00:00Z'))}</h3><p>{target?'Target: '+target+' kg. ':''}{forecast.reason}</p>{forecast.rate!==null&&<div><strong>{forecast.rate>0?<ArrowUp size={17}/>:<ArrowDown size={17}/>} {Math.abs(forecast.rate)} kg/week</strong><small>Observed rate, not a recommended rate. Trend fit: {Math.round((forecast.r2||0)*100)}%.</small></div>}<details><summary>How the estimate works</summary><p>At least 4 distinct dates spanning 21 days, with a measurement in the last 30 days. The line uses up to 90 days. Flat, noisy, opposing or very rapid trends and projections over a year show no date. These are app heuristics, not clinical validation. Trend fit describes line agreement, not a probability of reaching the goal. Strength, endurance and muscle gains cannot be predicted from weight alone.</p></details></article></section>:<p className="pr-forecast-note" aria-label="Goal outlook"><strong>A little more history first.</strong> {target?'Target: '+target+' kg. ':''}{forecast.reason}</p>}
    </div>
    <div role="tabpanel" id="pr-panel-documentation" aria-labelledby="pr-tab-documentation" hidden={tab!=='documentation'} tabIndex={0}>
    <ProgressRecords statusControl={progressStatus('Journal sync status')} timeZone={zone} period={documentationRange} onPeriodChange={setDocumentationRange} entries={entries} today={today} loading={loading} canEdit={!!owner&&!busy} offline={!!snapshot?.offline} onAdd={openEditor} onEdit={entry=>openEditor(entry.kind,entry)} onRemove={remove}/>
    <section id="progress-photos" className="pr-card pr-photos pr-documentation-card"><div className="pr-card-heading"><JournalHeaderArt variant="photos"/><div><h2>Your private photo timeline</h2><p className="pr-caption">Compare your own photos. Images are never used to estimate body fat or judge progress.</p></div><button disabled={!owner||busy||loading||snapshot?.offline} onClick={()=>openEditor('photo')}><Camera size={16}/>Add photo</button></div><ProgressPhotoTimeline key={owner||'local'} photos={photos} disabled={busy||!!snapshot?.offline} onEdit={entry=>openEditor('photo',entry)} onDelete={remove}/></section>
    </div>
    <div role="tabpanel" id="pr-panel-achievements" aria-labelledby="pr-tab-achievements" hidden={tab!=='achievements'} tabIndex={0}>
    <ProgressAchievements statusControl={progressStatus('Achievement sync status')} key={owner||'guest'} stats={achievementStats(weeks,[...(snapshot?.visits||[]),...(owner?pendingVisits(owner):[])],today,entries)} awards={snapshot?.awards||[]} userName={userName} onClaim={claimAchievement} offline={!!snapshot?.offline} signedIn={!!owner} loading={loading}/>

    </div>
    <dialog ref={dialog} className="pr-editor" onCancel={event=>{if(busy)event.preventDefault();else setEditor(null)}}><form onSubmit={submit}><header><div><p className="pr-eyebrow">YOUR PRIVATE JOURNAL</p><h2>{editor?.entry?'Edit ': 'Add '}{editor?.kind==='body'?'body measurements':editor?.kind==='wellness'?'a daily check-in':'a progress photo'}</h2></div><button type="button" aria-label="Close progress editor" disabled={busy} onClick={()=>setEditor(null)}><X size={19}/></button></header><label>Date<input type="date" required max={today} min="1900-01-01" value={form.date||today} onChange={e=>setForm({...form,date:e.target.value})}/></label>{editor?.kind==='body'&&<><p>Fill only the measurements you took. Use kg, percentages and centimeters.</p><div className="pr-form-grid">{['weightKg','bodyFat',...measurementFields].map(key=><label key={key}>{fieldNames[key]}<input type="number" inputMode="decimal" step="0.1" min={key==='weightKg'||key==='bodyFat'?1:5} max={key==='weightKg'?500:key==='bodyFat'?75:300} value={form[key]||''} placeholder="Optional" onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div></>}{editor?.kind==='wellness'&&<><p>A quick self-report, not a diagnosis. Leave anything you did not track blank.</p><div className="pr-form-grid">{['energy','mood','sleepQuality','soreness','rpe'].map(key=><label key={key}>{fieldNames[key]}<select aria-label={fieldNames[key]} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}><option value="">Not tracked</option>{Array.from({length:key==='rpe'?10:5},(_,i)=><option key={i} value={i+1}>{i+1}{key==='rpe'?(i===0?' - Very easy':i===9?' - Maximal':''):i===0?' - Low':i===4?' - High':''}</option>)}</select></label>)}<label>Sleep duration (hours)<input type="number" min={0} max={24} step="0.25" value={form.sleepHours||''} placeholder="Optional" onChange={e=>setForm({...form,sleepHours:e.target.value})}/></label></div></>}{editor?.kind==='photo'&&!editor.entry&&<label>Choose photo<input type="file" required accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/><small>JPEG, PNG or WebP, under 15 MB. Uploaded privately after compression.</small></label>}<label>{editor?.kind==='photo'?'Caption':'Notes'}<textarea maxLength={500} rows={3} value={form.notes||''} placeholder="Optional" onChange={e=>setForm({...form,notes:e.target.value})}/></label>{formError&&<p className="pr-error" role="alert">{formError}</p>}<footer><button type="button" disabled={busy} onClick={()=>setEditor(null)}>Cancel</button><button type="submit" disabled={busy||!owner}>{busy?'Saving…':'Save entry'}</button></footer></form></dialog>
  </div>
}
