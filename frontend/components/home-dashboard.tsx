'use client'
import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, BookOpen, CalendarDays, Check, Droplet, Dumbbell, Flame, Heart, MapPin, MessageCircle, Play, RefreshCw, Settings2, Trophy, Utensils } from 'lucide-react'
import { usePlanAccount } from '@/lib/playlist-account'
import { usePlanningProfile } from '@/lib/planning-profile'
import { cachedWeek, syncWeek, type StoredWeek } from '@/lib/daily-plans'
import { cachedProgress, loadProgress, type ProgressSnapshot } from '@/lib/progress'
import { listPlaylists } from '@/lib/playlists'
import { currentDay, currentWeek, foodCatalog, foodTotals, taskMinutes, workoutCatalog } from '../../shared/daily-plans'
import { CoachChat } from './coach-chat'
import { FoodArt } from './food-art'
import '@/app/home-dashboard.css'

export type HomeDestination = { page: 'plans' | 'social' | 'progress'; tab?: 'plan' | 'playlist' | 'library'; mode?: 'workout' | 'nutrition'; progressTab?: 'analytics' | 'documentation' | 'achievements'; socialSection?: 'forum' | 'people' | 'gym'; water?: boolean }
const tips = [
  { title: 'A little movement matters.', tag: 'MOVE', image: '/mascot/fox-plan-workout.png', text: 'You do not need an all-or-nothing day. Some physical activity is better than none. Start with an amount you can repeat and build gradually.', source: 'CDC', url: 'https://www.cdc.gov/physical-activity-basics/benefits/' },
  { title: 'Build variety into your plate.', tag: 'FUEL', image: '/mascot/fox-plan-nutrition.png', text: 'Different foods bring different nutrients. Include vegetables, fruit, whole grains and protein foods across your meals. Adapt your choices to your preferences and needs.', source: 'Health Canada', url: 'https://www.canada.ca/en/health-canada/services/food-guide/explore/healthy-eating-recommendations/eat-variety.html' },
  { title: 'Movement supports better sleep.', tag: 'RECOVER', image: '/mascot/fox-greeting.png', text: 'Regular physical activity can help improve sleep quality. Recovery is part of a consistent routine, alongside movement and food.', source: 'CDC', url: 'https://www.cdc.gov/physical-activity-basics/health-benefits/adults.html' },
]
function TipCard({ tip, index }: { tip: typeof tips[number]; index: number }) {
  const [flipped, setFlipped] = useState(false)
  return <article className={'hb-tip tip-' + index + (flipped ? ' flipped' : '')}>
    <button className="hb-tip-toggle" aria-expanded={flipped} aria-controls={flipped ? 'hb-tip-back-' + index : undefined} onClick={() => setFlipped(v => !v)}>
      {!flipped ? <><span className="hb-kicker">{tip.tag} / FIELD NOTES</span><img src={tip.image} width="180" height="180" alt="FitSync fox illustration" loading="lazy"/><h3>{tip.title}</h3><span className="hb-tip-action">Turn for a tip <RefreshCw size={14}/></span></> : <><span className="hb-kicker">A LITTLE KNOW-HOW</span><h3>{tip.title}</h3><p id={'hb-tip-back-' + index}>{tip.text}</p><span className="hb-tip-action">Back to cover <RefreshCw size={14}/></span></>}
    </button>
    {flipped && <a className="hb-tip-source" href={tip.url} target="_blank" rel="noreferrer">Read the source: {tip.source} <ArrowUpRight size={12}/></a>}
  </article>
}
export function HomeDashboard({ onOpen }: { onOpen: (destination: HomeDestination) => void }) {
  const identity = usePlanAccount(), owner = identity || 'local-tester', profile = usePlanningProfile(), zone = profile?.timeZone || 'Asia/Manila'
  const [clock, setClock] = useState(() => new Date()), [record, setRecord] = useState<StoredWeek | null>(null), [progress, setProgress] = useState<ProgressSnapshot | null>(null)
  const [playlists, setPlaylists] = useState<{ workout: number | null; nutrition: number | null }>({ workout: null, nutrition: null }), [social, setSocial] = useState<Partial<Record<'forum'|'people'|'gym', number>>>({})
  const [loading, setLoading] = useState(true), [notice, setNotice] = useState(''), [version, setVersion] = useState(0)
  const week = currentWeek(clock, zone), day = currentDay(clock, zone)
  useEffect(() => { const timer = setInterval(() => setClock(new Date()), 60000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    let live = true
    setRecord(cachedWeek(owner, week)); setProgress(identity ? cachedProgress(identity) : null); setPlaylists({workout:null,nutrition:null}); setSocial({}); setLoading(true); setNotice('')
    const refresh = async () => {
      const results = await Promise.allSettled([
        syncWeek(owner, week),
        identity ? loadProgress(identity) : Promise.resolve(null),
        identity ? listPlaylists('workout') : Promise.resolve(null),
        identity ? listPlaylists('nutrition') : Promise.resolve(null),
        ...(['forum','people','gym'] as const).map(async kind => {
          if (!identity || !navigator.onLine) return null
          const response = await fetch('/api/social?' + new URLSearchParams({action:'list',kind,page:'0'}), {cache:'no-store',signal:AbortSignal.timeout(15000)})
          const data = await response.json(); if (!response.ok) throw new Error('Community unavailable'); return {kind,count: Math.min(12,data.posts?.length || 0)}
        }),
      ])
      if (!live) return
      if(results[0].status==='fulfilled') {setRecord(results[0].value as StoredWeek); if((results[0].value as StoredWeek).error) setNotice('Showing your saved plan. Some account data could not refresh.')}
      if(results[1].status==='fulfilled')setProgress(results[1].value as ProgressSnapshot | null)
      setPlaylists({workout:results[2].status==='fulfilled' && Array.isArray(results[2].value)?results[2].value.length:null,nutrition:results[3].status==='fulfilled' && Array.isArray(results[3].value)?results[3].value.length:null})
      const recent:Partial<Record<'forum'|'people'|'gym',number>>={}
      results.slice(4).forEach(result=>{if(result.status==='fulfilled'&&result.value&&'kind' in result.value){const value=result.value as {kind:'forum'|'people'|'gym';count:number};recent[value.kind]=value.count}})
      setSocial(recent);setLoading(false)
      if(results.some(result=>result.status==='rejected'))setNotice('Some summaries could not refresh. Saved data stays available; open a section to retry.')
    }
    void refresh();window.addEventListener('online',refresh)
    return()=>{live=false;window.removeEventListener('online',refresh)}
  },[owner,identity,week,version])
  const today=record?.document.days[day], moves=today?.workout.items || [], foods=today?.nutrition.items || [], all=[...moves,...foods], done=all.filter(item=>item.done).length
  const water=today?.water.filter(glass=>glass.done).length || 0, calories=foodTotals(foods.filter(item=>item.done)).energy
  const minutes=Math.round(moves.filter(item=>item.done).reduce((sum,item)=>sum+taskMinutes(item),0))
  const latest=progress?.entries.filter(entry=>entry.kind==='body'&&entry.payload.weightKg!==undefined).sort((a,b)=>b.date.localeCompare(a.date))[0]
  const next=all.filter(item=>!item.done).sort((a,b)=>a.time.localeCompare(b.time))[0]
  const nextName=next?('foodId' in next?foodCatalog.find(food=>food.id===next.foodId)?.name:workoutCatalog.find(exercise=>exercise.id===next.exerciseId)?.name):null
  const openPlan=(mode:'workout'|'nutrition',tab:'plan'|'playlist'|'library'='plan')=>onOpen({page:'plans',mode,tab})
  return <div className="hb-root">
    <header className="hb-heading"><div><p className="hb-kicker">YOUR DAY, CONNECTED</p><h2>A little structure.<br/><em>A lot of possibility.</em></h2></div><button className="hb-refresh" disabled={loading} onClick={()=>setVersion(v=>v+1)}><RefreshCw size={15}/>{loading?'Refreshing…':'Refresh summaries'}</button></header>
    {notice&&<p className="hb-notice" role="status">{notice}</p>}{!identity&&<p className="hb-notice">Local preview: plan figures use this device. Sign in with a regular account for account summaries and chat.</p>}
    <section className="hb-overview" aria-label="Today at a glance">
      <article className="hb-today"><div className="hb-card-top"><span className="hb-kicker">TODAY / YOUR MOMENTUM</span><Flame size={20}/></div><div className="hb-completion"><strong>{done}<small> / {all.length}</small></strong><span>plan tasks completed</span></div><progress value={done} max={Math.max(1,all.length)} aria-label="Today's completed plan tasks"/><p>{nextName?<><b>Next in your schedule</b><br/>{next?.time} · {nextName}</>:all.length?'All planned tasks are done. Make room for recovery.':'Your day is a blank canvas. Start with a plan.'}</p><button onClick={()=>openPlan(next&&'foodId' in next?'nutrition':'workout')}>Open my day <ArrowUpRight size={18}/></button></article>
      <button className="hb-water" onClick={()=>onOpen({page:'plans',mode:'workout',tab:'plan',water:true})}><div className="hb-card-top"><span className="hb-kicker">A MOMENT TO HYDRATE</span><ArrowUpRight size={19}/></div><strong>{water}<small> / 8</small></strong><p>glasses logged today</p><div className="hb-water-drops" aria-hidden="true">{Array.from({length:8},(_,i)=><Droplet key={i} className={i<water?'filled':''} fill={i<water?'currentColor':'none'}/>)}</div><span className="hb-water-link">Go to your water log</span></button>
      <article className="hb-small-stat"><Activity size={21}/><span className="hb-kicker">MOVEMENT COMPLETED</span><strong>{minutes}<small> min</small></strong><p>From checked workout tasks</p></article>
      <article className="hb-small-stat food"><Utensils size={21}/><span className="hb-kicker">FOOD LOGGED</span><strong>{Math.round(calories)}<small> kcal</small></strong><p>From checked food tasks</p></article>
    </section>
    <section className="hb-shortcuts" aria-label="Quick actions"><CoachChat/><a href="/onboarding"><Settings2 size={20}/><span><strong>Make it personal</strong><small>Edit goals & onboarding</small></span><ArrowUpRight size={18}/></a></section>
    <header className="hb-section-heading"><div><p className="hb-kicker">MOVE / FUEL / MAKE IT YOURS</p><h2>Your planning studio</h2></div><span>Two modes. Everything in one place.</span></header>
    <section className="hb-studio" aria-label="Plan and library summaries">{(['workout','nutrition'] as const).map(mode=>{const nutrition=mode==='nutrition',items=nutrition?foods:moves,Icon=nutrition?Utensils:Dumbbell;return <div key={mode} className={'hb-mode '+mode}><div className="hb-mode-title"><Icon size={23}/><h3>{nutrition?'Fuel well.':'Move your way.'}</h3><span>{nutrition?'NUTRITION':'WORKOUT'}</span></div><div className="hb-mode-cards"><button className="hb-summary hb-plan" onClick={()=>openPlan(mode)}><span className="hb-card-top"><CalendarDays size={19}/><ArrowUpRight size={18}/></span><h4>{nutrition?'My meal plan':'My workout plan'}</h4><strong>{items.filter(item=>item.done).length}<small> / {items.length} done</small></strong><p>{!nutrition&&today?.workout.rest?'Recovery day':items.length?'Your saved schedule for today':'No tasks yet. Build your day.'}</p><div className="hb-mini-bars" aria-hidden="true">{record?.document.days.map((d,i)=> <i key={i} className={i===day?'current':''} style={{height:Math.max(5,Math.min(38,d[mode].items.length*5))}}/>)}</div></button><button className="hb-summary" onClick={()=>openPlan(mode,'playlist')}><span className="hb-card-top"><Play size={19}/><ArrowUpRight size={18}/></span><h4>{nutrition?'Food playlists':'Workout playlists'}</h4><strong>{playlists[mode]??'—'}</strong><p>{playlists[mode]===null?'Open your personal collection':'Your saved custom day/week plans'}</p></button><button className="hb-summary hb-library" onClick={()=>openPlan(mode,'library')}><span className="hb-card-top"><BookOpen size={19}/><ArrowUpRight size={18}/></span><div className="hb-library-art" aria-hidden="true">{nutrition?<FoodArt id="raw-banana" category="Fruits"/>:<img src="/exercises/dumbbell-bench-press.webp" width="75" height="75" alt="" loading="lazy"/>}</div><h4>{nutrition?'Food library':'Exercise library'}</h4><strong>{nutrition?foodCatalog.length:workoutCatalog.length}<small> to explore</small></strong><p>Learn, compare and find your favorites.</p></button></div></div>})}</section>
    <header className="hb-section-heading"><div><p className="hb-kicker">YOUR STORY, STILL UNFOLDING</p><h2>See how far you’ve come</h2></div></header>
    <section className="hb-progress-grid" aria-label="Progress summaries"><button onClick={()=>onOpen({page:'progress',progressTab:'analytics'})}><Activity size={23}/><h3>Analytics</h3><strong>{latest?latest.payload.weightKg+' kg':'Your bigger picture'}</strong><p>{latest?'Latest logged weight · '+latest.date:'Explore consistency, trends and time invested.'}</p><span>See your numbers <ArrowUpRight size={16}/></span></button><button onClick={()=>onOpen({page:'progress',progressTab:'documentation'})}><Heart size={23}/><h3>Documentation</h3><strong>{progress?progress.entries.length:'—'}<small> journal entries</small></strong><p>Measurements, private photos and how you feel.</p><span>Open your journal <ArrowUpRight size={16}/></span></button><button onClick={()=>onOpen({page:'progress',progressTab:'achievements'})}><Trophy size={23}/><h3>Achievements</h3><strong>{progress?progress.awards.length:'—'}<small> unlocked</small></strong><p>Celebrate the habits behind the progress.</p><span>View milestones <ArrowUpRight size={16}/></span></button></section>
    <header className="hb-section-heading"><div><p className="hb-kicker">A LITTLE KNOW-HOW</p><h2>Good habits start with good ideas.</h2></div><span>Browse the cards. Tap to turn one over.</span></header>
    <section className="hb-tips" aria-label="Fitness and nutrition tips">{tips.map((tip,i)=><TipCard key={tip.tag} tip={tip} index={i}/>)}</section>
    <header className="hb-section-heading"><div><p className="hb-kicker">BETTER WITH YOUR PEOPLE</p><h2>Find your support circle</h2></div></header>
    <section className="hb-social-grid" aria-label="Social summaries">{([{kind:'forum',name:'Open forum',text:'Questions, small wins and shared experiences.',icon:MessageCircle},{kind:'people',name:'Coaches & gym buddies',text:'Meet people with goals like yours.',icon:Heart},{kind:'gym',name:'Gyms & facilities',text:'Community reviews and nearby places to move.',icon:MapPin}] as const).map(({kind,name,text,icon:Icon})=><button key={kind} onClick={()=>onOpen({page:'social',socialSection:kind})}><Icon size={25}/><div><h3>{name}</h3><p>{text}</p><small>{social[kind]===undefined?'Explore the community':social[kind]===12?'12+ recent posts':social[kind]+' recent posts'}</small></div><ArrowUpRight size={19}/></button>)}</section>
  </div>
}
