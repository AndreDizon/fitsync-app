'use client'

import { useEffect, useRef, useState } from 'react'
import { AchievementEmblem } from './achievement-emblem'
import { AchievementShare } from './achievement-share'
import { Award, CalendarDays, Check, CheckCheck, Dumbbell, NotebookPen, Utensils, LockKeyhole, SlidersHorizontal, X } from 'lucide-react'
import { achievementStats, milestones, type Award as EarnedAward } from '../../shared/progress'
import '@/app/progress-achievements.css'

const categories = [
  { id: 'consistency', name: 'Showing up', description: 'Your app visits and longest app-use streak.', Icon: CalendarDays },
  { id: 'tasks', name: 'Small wins', description: 'Exercise and food entries you mark done.', Icon: CheckCheck },
  { id: 'training', name: 'Training', description: 'Workout days with every scheduled exercise finished.', Icon: Dumbbell },
  { id: 'nutrition', name: 'Food logging', description: 'Food portions marked done in My Plan.', Icon: Utensils },
  { id: 'journal', name: 'Your journal', description: 'Distinct days with a measurement or wellness check-in.', Icon: NotebookPen },
] as const


function CategoryHeaderArt({ category }: { category: string }) {
  return <svg className="ach-category-art" viewBox="0 0 440 120" preserveAspectRatio="xMaxYMid slice" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    {category==='consistency'&&<><path d="M460 16H324c-52 0-78 24-78 53s26 53 78 53h136M460 30H324c-39 0-62 18-62 39s23 39 62 39h136"/><path d="M-20 88H199c31 0 38-19 63-19"/></>}
    {category==='tasks'&&<><path d="M460 17H353q-17 0-17 17v17q0 17-17 17h-66q-17 0-17 17v10q0 17-17 17H-20M460 32H368q-17 0-17 17v17q0 17-17 17h-66q-17 0-17 17v10q0 17-17 17H-20"/><path d="M460 2H338q-17 0-17 17v17q0 17-17 17h-66q-17 0-17 17v10q0 17-17 17H-20" opacity=".6"/></>}
    {category==='training'&&<><path d="M460 13H372c-52 0-68 26-106 55s-64 37-116 37H-20M460 28H378c-52 0-68 26-106 55s-64 37-116 37H-20"/><path d="m363 76-16 22h86m-56-9-16 22h72"/></>}
    {category==='nutrition'&&<><path d="M460 47H392c-64 0-90-38-145-38S154 85 93 85H-20M460 62H398c-64 0-90-38-145-38S160 100 99 100H-20"/><path d="M460 105H350c-62 0-90-40-150-40S96 121-20 121" opacity=".65"/></>}
    {category==='journal'&&<><path d="M460 20H333c-30 0-48 9-68 30l-28 29c-20 21-38 29-68 29H-20M460 35H339c-30 0-48 9-68 30l-28 29c-20 21-38 29-68 29H-20"/><path d="M377 61h46q10 0 10 10v20l-22-22H298" opacity=".7"/></>}
  </g></svg>
}

export function ProgressAchievements({ stats, awards, offline, signedIn, loading, userName, onClaim }: { stats: ReturnType<typeof achievementStats>; awards: EarnedAward[]; offline: boolean; signedIn: boolean; loading: boolean; userName: string; onClaim: (code: string) => Promise<EarnedAward> }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const band=root.current?.querySelector<HTMLElement>('.ach-section-orange')
    const page=root.current?.closest('.content-wrap') || root.current?.parentElement
    if(!band||!page)return
    const measure=()=>{
      const bounds=band.getBoundingClientRect(),pageBounds=page.getBoundingClientRect()
      band.style.setProperty('--ach-bleed-left',Math.max(0,bounds.left-pageBounds.left)+'px')
      band.style.setProperty('--ach-bleed-right',Math.max(0,pageBounds.right-bounds.right)+'px')
    }
    measure()
    const observer=new ResizeObserver(measure)
    observer.observe(page);observer.observe(band);if(root.current)observer.observe(root.current)
    return()=>observer.disconnect()
  })
  const [claiming, setClaiming] = useState('')
  const [claimError, setClaimError] = useState<{code:string;message:string}|null>(null)
  const [selected, setSelected] = useState<{badge:typeof milestones[number];award:EarnedAward}|null>(null)

  async function claim(badge:typeof milestones[number]) {
    if(claiming)return
    setClaimError(null);setClaiming(badge.code)
    try { const award=await onClaim(badge.code);setSelected({badge,award}) } catch(error) {setClaimError({code:badge.code,message:(error as Error).message})}finally{setClaiming('')}
  }
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const earned = new Map(awards.map(award => [award.code, award.awarded_at]))
  const total = milestones.filter(badge => earned.has(badge.code)).length
  const [sort, setSort] = useState('rank')
  const claimedCodes = new Set(awards.filter(award=>award.claimed_at).map(award=>award.code))
  const readyCount = milestones.filter(badge=>earned.has(badge.code)&&!claimedCodes.has(badge.code)).length
  const matchesStatus = (badge: typeof milestones[number], value:string) => value === 'all' || (value === 'earned' ? earned.has(badge.code) : value === 'claimed' ? claimedCodes.has(badge.code) : value === 'unclaimed' ? earned.has(badge.code)&&!claimedCodes.has(badge.code) : !earned.has(badge.code))
  const candidates = milestones.filter(badge => category === 'all' || badge.category === category)
  const countForStatus = (value:string) => candidates.filter(badge=>matchesStatus(badge,value)).length
  const visible = candidates.filter(badge=>matchesStatus(badge,status)).sort((a,b)=>{
    if(sort==='closest')return Math.min(stats[b.metric]/b.target,1)-Math.min(stats[a.metric]/a.target,1)
    if(sort==='newest')return (earned.get(b.code)||'').localeCompare(earned.get(a.code)||'')
    return 0
  })
  const filtered = category!=='all' || status!=='all'
  const statusNames:Record<string,string>={all:'All achievements',earned:'Unlocked',unclaimed:'Ready to claim',claimed:'Claimed',remaining:'Still to earn'}
  function resetFilters(){setCategory('all');setStatus('all');setSort('rank')}
  return <div ref={root} className="pa-achievements">
    <header className="ach-intro"><div><h2>Make room for your wins.</h2><p>30 milestones. Five parts of your routine. Claim each win and make it yours.</p></div><div className="ach-total"><Award size={24}/><strong>{total}<small> / 30</small></strong><span>unlocked</span><progress value={total} max={30} aria-label={`${total} of 30 achievements unlocked`}/></div></header>

    {(!signedIn || offline || loading) && <p className="ach-notice" role="status">{loading ? 'Loading your saved achievements…' : !signedIn ? 'Sign in to save achievements. Your collection unlocks from your saved records.' : 'Viewing saved achievements. Reconnect and refresh Progress to confirm new milestones.'}</p>}
    <section className="ach-filter-bar" aria-label="Filter achievements"><div className="ach-filter-heading"><h3><SlidersHorizontal size={17}/>Filter achievements</h3><span className="ach-ready-indicator" role="status" aria-live="polite">{readyCount} ready to claim</span></div>
      <div className="ach-filters">
        <label>Category<select aria-label="Achievement category" value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label>Status<select aria-label="Achievement status" value={status} onChange={event => setStatus(event.target.value)}>{Object.entries(statusNames).map(([value])=><option key={value} value={value}>{({all:'All',earned:'Unlocked',unclaimed:'To claim',claimed:'Claimed',remaining:'Locked'} as Record<string,string>)[value]} ({countForStatus(value)})</option>)}</select></label>
        <label>Sort by<select aria-label="Achievement sort order" value={sort} onChange={event=>setSort(event.target.value)}><option value="rank">Milestone order</option><option value="closest">Closest to completing</option><option value="newest">Recently unlocked</option></select></label>
      </div>
      <div className="ach-filter-footer"><p className="ach-count" role="status" aria-live="polite">Showing <strong>{visible.length}</strong> of {milestones.length} achievements</p>{(filtered||sort!=='rank') && <button type="button" className="ach-reset" onClick={resetFilters}>Reset filters</button>}</div>
      {filtered && <div className="ach-active-filters" aria-label="Active achievement filters">{category!=='all'&&<button type="button" onClick={()=>setCategory('all')} aria-label="Remove category filter">{categories.find(group=>group.id===category)?.name}<X size={13}/></button>}{status!=='all'&&<button type="button" onClick={()=>setStatus('all')} aria-label="Remove status filter">{statusNames[status]}<X size={13}/></button>}</div>}
    </section>
    {[['consistency','tasks'],['training','nutrition','journal']].map((ids,bandIndex)=>{
      const groups=categories.filter(group=>ids.includes(group.id)&&(category==='all'||group.id===category)&&visible.some(badge=>badge.category===group.id))
      if(!groups.length)return null
      return <div key={bandIndex} className={'ach-section-band '+(bandIndex===1?'ach-section-orange':'ach-section-white')}>{groups.map(group => {
      const badges = visible.filter(badge => badge.category === group.id)
      if (!badges.length) return null
      return <section className={'ach-category ach-' + group.id} key={group.id} aria-labelledby={'ach-heading-' + group.id}><header><CategoryHeaderArt category={group.id}/><group.Icon size={22}/><div><h3 id={'ach-heading-' + group.id}>{group.name}</h3><p>{group.description}</p></div><span>{milestones.filter(badge => badge.category === group.id && earned.has(badge.code)).length} / 6 unlocked</span></header><div className="ach-grid">{badges.map((badge) => {
        const unlocked = earned.has(badge.code), count = Math.min(stats[badge.metric], badge.target), ready = count >= badge.target
        const earnedDate = earned.get(badge.code)?.slice(0, 10)
        const savedAward=awards.find(award=>award.code===badge.code), claimed=!!savedAward?.claimed_at
        const tier=milestones.filter(item=>item.category===group.id).findIndex(item=>item.code===badge.code)+1
        return <article key={badge.code} className={unlocked ? 'is-earned' : ''}><div className="ach-badge"><AchievementEmblem category={badge.category} tier={tier} earned={unlocked}/></div><span className="ach-state">{unlocked ? <Check size={13}/> : <LockKeyhole size={12}/>} {claimed ? 'Claimed' : unlocked ? 'Ready to claim' : ready ? 'Awaiting sync' : 'Still to earn'}</span><h4>{badge.name}</h4><p>{badge.description}.</p><div className="ach-card-footer"><progress max={badge.target} value={unlocked ? badge.target : count} aria-label={badge.description}/><span className={unlocked && earnedDate ? 'ach-earned-date' : undefined}>{unlocked && earnedDate ? 'Earned ' + new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(earnedDate + 'T12:00:00Z')) : count + ' / ' + badge.target + ' recorded'}</span>{unlocked && <button className="ach-claim" type="button" disabled={!!claiming || (!claimed && (offline || !signedIn))} onClick={() => claimed && savedAward ? setSelected({badge,award:savedAward}) : void claim(badge)}>{claiming===badge.code ? 'Claiming…' : <><span className="ach-action-full">{claimed ? 'View share card' : 'Claim achievement'}</span><span className="ach-action-compact" aria-hidden="true">{claimed ? 'Share' : 'Claim'}</span></>}</button>}{claimError?.code===badge.code && <p role="alert" className="ach-claim-error">{claimError.message}</p>}</div></article>
      })}</div></section>
    })}</div>})}
    {!visible.length && <div className="ach-empty"><Award size={28}/><h3>{status === 'unclaimed' && total > 0 ? 'You’re all caught up' : status === 'earned' || status === 'unclaimed' ? 'Your first milestone is ahead' : 'Nothing left in this view'}</h3><p>Choose another status or category, or return to the full collection.</p><button type="button" onClick={resetFilters}>Show all achievements</button></div>}
    {selected && <AchievementShare badge={selected.badge} award={selected.award} userName={userName} total={total} onClose={() => setSelected(null)}/>}
    <p className="ach-footnote">Earned achievements stay unlocked. New achievements are confirmed when saved records sync and Progress refreshes. Counts use available saved history; app visits, completed tasks, food logs and journal days are separate measures. Food achievements reward logging, not eating more. No weight-change targets or calorie restrictions are required.</p>
  </div>
}
