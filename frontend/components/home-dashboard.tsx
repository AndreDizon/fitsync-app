'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Droplet, Flame, RefreshCw, Settings2 } from 'lucide-react'
import { usePlanAccount } from '@/lib/playlist-account'
import { usePlanningProfile } from '@/lib/planning-profile'
import { cachedWeek, syncWeek, type StoredWeek } from '@/lib/daily-plans'
import { cachedProgress, loadProgress, type ProgressSnapshot } from '@/lib/progress'
import { currentDay, currentWeek, foodCatalog, foodTotals, taskMinutes, workoutCatalog } from '../../shared/daily-plans'
import { CoachChat } from './coach-chat'
import { HomeCardArt } from './home-card-art'
import { HomeInsights } from './home-insights'
import '@/app/home-dashboard.css'
import '@/app/home-experiment.css'

export type HomeDestination = { page: 'plans' | 'social' | 'progress'; tab?: 'plan' | 'playlist' | 'library'; mode?: 'workout' | 'nutrition'; progressTab?: 'analytics' | 'documentation' | 'achievements'; socialSection?: 'forum' | 'people' | 'gym'; water?: boolean }
const tips = [
  { title: 'A little movement matters.', tag: 'MOVE', image: '/mascot/fox-plan-workout.png', text: 'You do not need an all-or-nothing day. Some physical activity is better than none. Start with an amount you can repeat and build gradually.', source: 'CDC', url: 'https://www.cdc.gov/physical-activity-basics/benefits/' },
  { title: 'Build variety into your plate.', tag: 'FUEL', image: '/mascot/fox-plan-nutrition.png', text: 'Different foods bring different nutrients. Include vegetables, fruit, whole grains and protein foods across your meals. Adapt your choices to your preferences and needs.', source: 'Health Canada', url: 'https://www.canada.ca/en/health-canada/services/food-guide/explore/healthy-eating-recommendations/eat-variety.html' },
  { title: 'Movement supports better sleep.', tag: 'RECOVER', image: '/mascot/fox-greeting.png', text: 'Regular physical activity can help improve sleep quality. Recovery is part of a consistent routine, alongside movement and food.', source: 'CDC', url: 'https://www.cdc.gov/physical-activity-basics/health-benefits/adults.html' },
  { title: 'Strength serves everyday life.', tag: 'STRENGTH', text: 'Muscle-strengthening activity helps maintain or build strength. That strength supports everyday movements, from carrying groceries to climbing stairs. Increase your workload gradually.', source: 'CDC', url: 'https://www.cdc.gov/physical-activity-basics/benefits/' },
  { title: 'Your brain benefits, too.', tag: 'MIND', text: 'Physical activity benefits more than muscles. Some brain benefits begin after a session, and regular activity supports thinking, learning and emotional well-being over time.', source: 'CDC', url: 'https://www.cdc.gov/physical-activity-basics/benefits/' },
  { title: 'Make room for a water break.', tag: 'HYDRATE', text: 'Use your water log as a reminder to check in throughout the day. The eight-glass tracker is a starting point, not a measurement of your individual fluid needs. Your needs vary with activity and conditions.', source: 'Health Canada', url: 'https://food-guide.canada.ca/en/healthy-eating-recommendations/make-water-your-drink-of-choice/' },
  { title: 'Movement has many forms.', tag: 'EXPLORE', text: 'Physical activity does not have to happen in a gym. Dancing, walking and active everyday tasks can all add movement to your week. Pick something you enjoy and can return to.', source: 'CDC', url: 'https://www.cdc.gov/physical-activity-basics/benefits/' },
  { title: 'Build up at your own pace.', tag: 'CONSISTENCY', text: 'A repeatable starting point beats an overwhelming schedule. Begin with manageable activity and gradually increase what you do. Your routine can grow as your confidence and capacity grow.', source: 'CDC', url: 'https://www.cdc.gov/physical-activity-basics/benefits/' },
  { title: 'Strength helps beyond the gym.', tag: 'EVERYDAY', text: 'Stairs, shopping bags and everyday chores all ask something of your body. Regular physical activity supports the ability to carry out everyday tasks, so progress is about more than a number on the scale.', source: 'CDC', url: 'https://www.cdc.gov/physical-activity-basics/benefits/' },
  { title: 'Your week can be flexible.', tag: 'ROUTINE', text: 'Physical activity can fit different weekly schedules. For adults, the same weekly activity time can be spread across several days in a way that works for them. A routine does not have to look identical every day.', source: 'CDC', url: 'https://www.cdc.gov/physical-activity-basics/benefits/' },
]
function MetricRing({ value, max, label, orange = false }: { value: number; max: number; label: string; orange?: boolean }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return <div className={'hx-ring' + (orange ? ' orange' : '')} role="img" aria-label={label}><svg viewBox="0 0 120 120" aria-hidden="true"><circle className="hx-ring-track" cx="60" cy="60" r="48"/><circle className="hx-ring-value" cx="60" cy="60" r="48" pathLength="100" opacity={ratio > 0 ? 1 : 0} strokeDasharray={ratio * 100 + ' 100'}/></svg><strong>{value}<small>{max > 0 ? ' / ' + max : ' planned: 0'}</small></strong></div>
}
function TipCard({ tip, index, active }: { tip: typeof tips[number]; index: number; active: boolean }) {
  const [userFlipped, setUserFlipped] = useState<boolean | null>(null)
  const flipped = userFlipped ?? active
  return <article className={'hb-tip tip-' + (index % tips.length) + (flipped ? ' flipped' : '') + (active ? ' is-featured' : '')}>
    <button className="hb-tip-toggle" aria-expanded={flipped} aria-controls={flipped ? 'hb-tip-back-' + index : undefined} onClick={() => setUserFlipped(!flipped)}>
      <span className="hb-tip-face" key={flipped ? 'information' : 'cover'}>{!flipped ? <><span className="hb-kicker">{tip.tag} / FIELD NOTES</span><div className="hb-tip-illustration"><HomeCardArt subject={index%tips.length===8?'documentation':index%tips.length===9?'playlist':index%tips.length===1?'food':index%tips.length===2?'recovery':index%tips.length===4?'analytics':index%tips.length===5?'water':index%tips.length===6?'people':index%tips.length===7?'day':'movement'}/></div><h3>{tip.title}</h3><span className="hb-tip-action">Turn for a tip <RefreshCw size={14}/></span></> : <><span className="hb-kicker">A LITTLE KNOW-HOW</span><h3>{tip.title}</h3><p id={'hb-tip-back-' + index}>{tip.text}</p><span className="hb-tip-action">Back to cover <RefreshCw size={14}/></span></>}</span>
    </button>
    {flipped && <a className="hb-tip-source" href={tip.url} target="_blank" rel="noreferrer">Read the source: {tip.source} <ArrowUpRight size={12}/></a>}
  </article>
}
function FactsCarousel() {
  const dotColors = ['#d88a48','#7c9e4c','#9673bc','#6894c9','#c67b9b','#5fa9bb','#d87f6b','#c6a03d','#6f9f89','#ac8665']
  const track = useRef<HTMLDivElement>(null)
  const activeRef = useRef(tips.length + 1)
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [active, setActive] = useState(1)
  const update = () => {
    const el = track.current; if (!el) return
    const center = el.scrollLeft + el.clientWidth / 2
    let closest = 0, distance = Infinity
    Array.from(el.children).forEach((child, i) => { const card = child as HTMLElement; const delta = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center); if (delta < distance) { closest = i; distance = delta } })
    activeRef.current = closest; setActive(closest % tips.length)
    if (settle.current) clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      if (closest >= tips.length && closest < tips.length * 2) return
      const target = tips.length + closest % tips.length
      const card = el.children[target] as HTMLElement
      el.scrollTo({left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior: 'instant'})
      activeRef.current = target
    }, 160)
  }
  const goTo = (index: number, smooth = true) => {
    const el = track.current, child = el?.children[index] as HTMLElement | undefined; if (!el || !child) return
    el.scrollTo({ left: child.offsetLeft + child.offsetWidth / 2 - el.clientWidth / 2, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' })
  }
  useEffect(() => { const el = track.current; if (!el) return; const observer = new ResizeObserver(() => goTo(activeRef.current, false)); observer.observe(el); goTo(tips.length + 1, false); return () => { observer.disconnect(); if (settle.current) clearTimeout(settle.current) } }, [])
  return <section className="hb-facts" aria-label="Fitness and nutrition facts">
    <svg className="hb-facts-halftone" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{color:dotColors[active]}}>{Array.from({length:21},(_,row)=>Array.from({length:51},(_,col)=>{const x=col*20,y=row*20;const strength=Math.max(0,1-Math.pow((x-500)/530,2)-Math.pow((y-210)/225,2));return <circle key={row+'-'+col} cx={x} cy={y} r={.45+strength*4.2}/> }))}</svg>
    <div className="hb-facts-toolbar"><span>Fact {active + 1} of {tips.length} | Tap any card to turn it over</span><div><button type="button" aria-label="Previous facts" aria-controls="home-facts-track" onClick={() => goTo(activeRef.current - 1)}><ArrowLeft size={19}/></button><button type="button" aria-label="Next facts" aria-controls="home-facts-track" onClick={() => goTo(activeRef.current + 1)}><ArrowRight size={19}/></button></div></div>
    <div className="hb-tips" id="home-facts-track" ref={track} onScroll={update} tabIndex={0} aria-label="Swipe or use the arrows to browse facts" onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); goTo(activeRef.current + (event.key === 'ArrowRight' ? 1 : -1)) } }}>{Array.from({length:3},(_,copy)=>tips.map((tip,i)=><div className="hb-loop-slide" key={copy+'-'+tip.tag} aria-hidden={copy!==1 || undefined} inert={copy!==1}><TipCard tip={tip} index={copy*tips.length+i} active={active === i}/></div>))}</div>
  </section>
}
function WaterBottle({ glasses }: { glasses: number }) {
  return <div className="hb-bottle" role="img" aria-label={glasses + ' of 8 glasses logged'}><div className="hb-bottle-cap"/><div className="hb-bottle-body"><div className="hb-bottle-fill" style={{height: Math.min(100, glasses / 8 * 100) + '%'}}/>{[1,2,3].map(i=><i key={i} style={{bottom: i * 25 + '%'}}/>)}<span>{Math.round(glasses / 8 * 100)}%</span></div></div>
}
function DailyTrack({ done, total }: { done: number; total: number }) {
  return <svg className="hb-daily-track" viewBox="0 0 240 135" role="img" aria-label={done + ' of ' + total + ' tasks completed'}><rect x="17" y="15" width="206" height="105" rx="52" fill="none" stroke="#ffffff20" strokeWidth="2"/><rect x="30" y="28" width="180" height="79" rx="39" fill="none" stroke="#ffffff30" strokeWidth="2"/><rect x="43" y="41" width="154" height="53" rx="26" fill="none" stroke="#ffdf3255" strokeWidth="10"/><rect x="43" y="41" width="154" height="53" rx="26" fill="none" stroke="#ffdf32" strokeWidth="10" pathLength="100" strokeDasharray={(total ? done / total * 100 : 0) + ' 100'} strokeLinecap="round" opacity={done ? 1 : 0}/><text x="120" y="75" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="800">{done}/{total}</text><path d="M200 70V112M200 71H217V87H200" fill="#ff7300" stroke="#ffdf32" strokeWidth="2"/></svg>
}
export function HomeDashboard({ onOpen }: { onOpen: (destination: HomeDestination) => void }) {
  const identity = usePlanAccount(), owner = identity || 'local-tester', profile = usePlanningProfile(), zone = profile?.timeZone || 'Asia/Manila'
  const [clock, setClock] = useState(() => new Date()), [record, setRecord] = useState<StoredWeek | null>(null), [progress, setProgress] = useState<ProgressSnapshot | null>(null)
  const [loading, setLoading] = useState(true), [notice, setNotice] = useState(''), [version, setVersion] = useState(0)
  const week = currentWeek(clock, zone), day = currentDay(clock, zone)
  useEffect(() => { const timer = setInterval(() => setClock(new Date()), 60000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    let live = true
    setRecord(cachedWeek(owner, week)); setProgress(identity ? cachedProgress(identity) : null); setLoading(true); setNotice('')
    const refresh = async () => {
      const results = await Promise.allSettled([
        syncWeek(owner, week),
        identity ? loadProgress(identity) : Promise.resolve(null),
      ])
      if (!live) return
      if(results[0].status==='fulfilled') {setRecord(results[0].value as StoredWeek); if((results[0].value as StoredWeek).error) setNotice('Showing your saved plan. Some account data could not refresh.')}
      if(results[1].status==='fulfilled')setProgress(results[1].value as ProgressSnapshot | null)
      setLoading(false)
      if(results.some(result=>result.status==='rejected'))setNotice('Some summaries could not refresh. Saved data stays available; open a section to retry.')
    }
    void refresh();window.addEventListener('online',refresh)
    return()=>{live=false;window.removeEventListener('online',refresh)}
  },[owner,identity,week,version])
  const today=record?.document.days[day], moves=today?.workout.items || [], foods=today?.nutrition.items || [], all=[...moves,...foods], done=all.filter(item=>item.done).length
  const water=today?.water.filter(glass=>glass.done).length || 0, calories=foodTotals(foods.filter(item=>item.done)).energy
  const plannedMinutes=Math.round(moves.reduce((sum,item)=>sum+taskMinutes(item),0))
  const minutes=Math.round(moves.filter(item=>item.done).reduce((sum,item)=>sum+taskMinutes(item),0))
  const next=all.filter(item=>!item.done).sort((a,b)=>a.time.localeCompare(b.time))[0]
  const nextName=next?('foodId' in next?foodCatalog.find(food=>food.id===next.foodId)?.name:workoutCatalog.find(exercise=>exercise.id===next.exerciseId)?.name):null
  const openPlan=(mode:'workout'|'nutrition',tab:'plan'|'playlist'|'library'='plan')=>onOpen({page:'plans',mode,tab})
  return <div className="hb-root home-energy">
    <div className="hb-body-band hb-band-white">
    <header className="hb-heading"><div><p className="hb-kicker">YOUR DAY, CONNECTED</p><h2>Your training.<br/><em>In focus.</em></h2></div><button className="hb-refresh" disabled={loading} onClick={()=>setVersion(v=>v+1)}><RefreshCw size={15}/>{loading?'Refreshing…':'Refresh summaries'}</button></header>
    {notice&&<p className="hb-notice" role="status">{notice}</p>}
    <section className="hb-overview" aria-label="Today at a glance">
      <article className="hb-today"><div className="hb-card-top"><span className="hb-kicker">TODAY / YOUR MOMENTUM</span><Flame size={20}/></div><HomeCardArt subject="day"/><div className="hb-completion"><DailyTrack done={done} total={all.length}/><span>plan tasks completed</span></div><progress value={done} max={Math.max(1,all.length)} aria-label="Today's completed plan tasks"/><p>{nextName?<><b>Next in your schedule</b><br/>{next?.time} · {nextName}</>:all.length?'All planned tasks are done. Make room for recovery.':'Your day is a blank canvas. Start with a plan.'}</p><button onClick={()=>openPlan(next&&'foodId' in next?'nutrition':'workout')}>Open my day <ArrowUpRight size={18}/></button></article>
      <button className="hb-water" onClick={()=>onOpen({page:'plans',mode:'workout',tab:'plan',water:true})}><div className="hb-card-top"><span className="hb-kicker">A MOMENT TO HYDRATE</span><ArrowUpRight size={19}/></div><strong>{water}<small> / 8</small></strong><p>glasses logged today</p><HomeCardArt subject="water"/><div className="hb-water-visuals"><WaterBottle glasses={water}/><div className="hb-water-drops" aria-hidden="true">{Array.from({length:8},(_,i)=><Droplet key={i} className={i<water?'filled':''} fill={i<water?'currentColor':'none'}/>)}</div></div><span className="hb-water-link">Go to your water log</span></button>
      <article className="hb-small-stat"><HomeCardArt subject="movement"/><span className="hb-kicker">MOVEMENT COMPLETED</span><MetricRing value={minutes} max={plannedMinutes} label={`${minutes} of ${plannedMinutes} planned minutes completed`} orange/><p>From checked workout tasks</p></article>
      <article className="hb-small-stat food"><HomeCardArt subject="food"/><span className="hb-kicker">FOOD LOGGED</span><strong>{Math.round(calories)}<small> kcal</small></strong><p>From checked food tasks</p></article>
    </section>
    <section className="hb-next-panel" aria-label="Your next step"><div className="hb-next-art"><HomeCardArt subject={next && 'foodId' in next ? 'food' : 'plan'}/></div><div><span className="hb-next-label">Your next step</span><h3>{nextName || (all.length ? 'All planned tasks are complete.' : 'Give today a starting point.')}</h3><p>{nextName ? next?.time + ' | ' + ('foodId' in next! ? 'Nutrition' : 'Workout') + ' | Next unfinished task in your schedule' : all.length ? 'Your completed tasks are reflected in the numbers above.' : 'Choose a playlist, formulate your day, or build it from the library.'}</p><button onClick={()=>openPlan(next && 'foodId' in next ? 'nutrition' : 'workout')}>{nextName ? 'View in my plan' : 'Open my plan'}<ArrowUpRight size={17}/></button></div><div className="hb-week-pulse"><span>Your week so far</span><div>{record?.document.days.map((d,i)=>{const items=[...d.workout.items,...d.nutrition.items], count=items.filter(t=>t.done).length;return <span key={i} title={['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]+': '+count+' of '+items.length+' tasks done'}><i style={{height:Math.max(5,items.length ? count/items.length*46 : 5)}} className={i===day?'current':''}/><small>{['M','T','W','T','F','S','S'][i]}</small></span>})}</div><small>Completed plan tasks | {zone}</small></div></section>
    <section className="hb-shortcuts" aria-label="Quick actions"><CoachChat/><a href="/onboarding"><Settings2 size={20}/><span><strong>Make it personal</strong><small>Edit goals & onboarding</small></span><ArrowUpRight size={18}/></a></section>
    </div>
    <div className="hb-body-band hb-band-orange"><HomeInsights week={record?.document || null} progress={progress} profile={profile} today={day}/></div>
    <div className="hb-body-band hb-band-brown">
    <header className="hb-section-heading"><div><p className="hb-kicker">A LITTLE KNOW-HOW</p><h2>Good habits start with good ideas.</h2></div><span>Browse the cards. Tap to turn one over.</span></header>
    <FactsCarousel/>
    </div>
  </div>
}

