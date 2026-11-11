'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, Dumbbell, Heart, Trophy, Utensils } from 'lucide-react'
import { foodTotals, taskMinutes, workoutCatalog, weekDays, type PlanWeek } from '../../shared/daily-plans'
import { goalOptions, type OnboardingProfile } from '../../shared/onboarding'
import { milestones } from '../../shared/progress'
import type { ProgressSnapshot } from '@/lib/progress'
import { HomeCardArt } from './home-card-art'
import { Wordmark } from './wordmark'
import '@/app/home-insights.css'

const round = (value: number) => Math.round(value * 10) / 10
const dateLabel = (value: string) => new Intl.DateTimeFormat('en', {month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'))

/** Read-only summaries of canonical saved plans and progress; no synthetic activity. */
export function HomeInsights({ week, progress, profile, today }: { week: PlanWeek | null; progress: ProgressSnapshot | null; profile: OnboardingProfile | null; today: number }) {
  const grid = useRef<HTMLDivElement>(null)
  const brandFiller = useRef<HTMLDivElement>(null)
  const sessionList = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = grid.current; if (!root) return
    const panels = Array.from(root.querySelectorAll<HTMLElement>(':scope > .hi-panel'))
    let frame = 0
    const placeBrand = () => {
      const brand = brandFiller.current; if (!brand) return
      brand.hidden = true
      if (!root.classList.contains('hi-masonry')) return
      const bounds = root.getBoundingClientRect()
      const rects = panels.map(panel => panel.getBoundingClientRect())
      const middle = bounds.left + bounds.width / 2
      const leftEnd = Math.max(...rects.filter(r => r.left < middle).map(r => r.bottom))
      const rightEnd = Math.max(...rects.filter(r => r.left >= middle).map(r => r.bottom))
      const space = Math.abs(leftEnd - rightEnd) - 32
      if (space < 100 || bounds.width < 500) return
      const onLeft = leftEnd < rightEnd
      brand.style.left = onLeft ? '0' : 'calc(50% + 8px)'
      brand.style.top = Math.min(leftEnd,rightEnd) - bounds.top + 16 + 'px'
      brand.style.height = space + 'px'
      brand.style.setProperty('--brand-size', Math.min((bounds.width / 2 - 56) / 3.5, space >= 215 ? space * .22 : space * .48, 110) + 'px')
      brand.style.setProperty('--brand-mascot-size', Math.min(bounds.width * .22, space * .48, 230) + 'px')
      brand.dataset.full = space >= 215 ? 'true' : 'false'
      brand.hidden = false
    }
    const layout = () => {
      cancelAnimationFrame(frame)
      if (window.matchMedia('(max-width: 740px)').matches) {
        root.classList.remove('hi-masonry')
        panels.forEach(panel => panel.style.removeProperty('grid-row-end'))
        if (brandFiller.current) brandFiller.current.hidden = true
        return
      }
      const gap = parseFloat(getComputedStyle(root).rowGap) || 16
      panels.forEach(panel => { panel.style.gridRowEnd = 'span ' + Math.ceil((panel.getBoundingClientRect().height + gap) / (8 + gap)) })
      root.classList.add('hi-masonry')
      frame = requestAnimationFrame(placeBrand)
    }
    const observer = new ResizeObserver(layout)
    panels.forEach(panel => observer.observe(panel))
    window.addEventListener('resize', layout)
    layout()
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', layout) }
  }, [])
  const [selected, setSelected] = useState(today)
  const [chartMode, setChartMode] = useState<'minutes'|'tasks'>('minutes')
  const days = week?.days || []
  const selectedDay = days[selected]
  const moves = selectedDay?.workout.items || []
  useEffect(() => {
    const list = sessionList.current; if (!list) return
    const rows = Array.from(list.children) as HTMLElement[]
    const resize = () => {
      if (rows.length < 3) { list.style.maxHeight = 'none'; return }
      const height = rows[0].getBoundingClientRect().height + rows[1].getBoundingClientRect().height + rows[2].getBoundingClientRect().height / 2
      list.style.maxHeight = height + 'px'
    }
    const observer = new ResizeObserver(resize)
    rows.forEach(row => observer.observe(row))
    resize()
    return () => observer.disconnect()
  }, [selected, week])
  const foods = selectedDay?.nutrition.items || []
  const plannedFood = foodTotals(foods), loggedFood = foodTotals(foods.filter(item=>item.done))
  const dayStats = weekDays.map((name,i)=>{
    const workout = days[i]?.workout.items || [], food = days[i]?.nutrition.items || []
    const tasks = [...workout,...food]
    return {name,minutes:round(workout.filter(item=>item.done).reduce((n,item)=>n+taskMinutes(item),0)),planned:round(workout.reduce((n,item)=>n+taskMinutes(item),0)),done:tasks.filter(item=>item.done).length,total:tasks.length,rest:days[i]?.workout.rest || false}
  })
  const max = Math.max(1,...dayStats.map(d=>chartMode==='minutes'?d.planned:d.total))
  const weeklyMinutes = round(dayStats.reduce((n,d)=>n+d.minutes,0))
  const weeklyDone = dayStats.reduce((n,d)=>n+d.done,0)
  const completedSessions = days.filter(d=>d.workout.items.length>0 && d.workout.items.every(item=>item.done)).length
  const activeDays = dayStats.filter(d=>d.done>0).length
  const wellness = progress?.entries.filter(e=>e.kind==='wellness').sort((a,b)=>b.date.localeCompare(a.date))[0]
  const weightLogs = (progress?.entries || []).filter(e=>e.kind==='body' && typeof e.payload.weightKg==='number').sort((a,b)=>a.date.localeCompare(b.date)).slice(-8)
  const first = weightLogs[0], last = weightLogs[weightLogs.length-1]
  const delta = first && last && first!==last ? round(last.payload.weightKg! - first.payload.weightKg!) : null
  const weights = weightLogs.map(e=>e.payload.weightKg!)
  const low = Math.min(...weights), high = Math.max(...weights)
  const coordinates = weightLogs.map((entry,i)=>{
    const firstDate=Date.parse(first.date),lastDate=Date.parse(last.date)
    return [lastDate===firstDate ? 150 : 15+(Date.parse(entry.date)-firstDate)/(lastDate-firstDate)*270, high===low?60:105-(entry.payload.weightKg!-low)/(high-low)*85]
  })
  const awards = new Set(progress?.awards.map(a=>a.code) || [])
  const nextMilestone = milestones.find(m=>!awards.has(m.code))
  const actualSets = moves.reduce((n,item)=>n+(item.actualSets?.length || 0),0)
  const focus = profile?.focusAreas?.join(' / ') || 'Not set'
  return <section className="hi-workspace" aria-label="Personal training insights">
    <header className="hi-heading"><div><span>Your performance desk</span><h2>The week, in perspective.</h2></div><p>{goalOptions.find(g=>g[0]===profile?.goal)?.[1] || 'Your personal routine'}<small>{focus}</small></p></header>
    <div className="hi-grid" ref={grid}>
      <article className="hi-panel hi-week">
        <div className="hi-card-filler" aria-hidden="true"><HomeCardArt subject="day"/></div>
        <header><div><span className="hi-eyebrow">Training rhythm</span><h3>Every session adds up.</h3></div><Activity size={22}/></header>
        <div className="hi-week-numbers"><div><strong>{weeklyMinutes}</strong><span>estimated minutes completed</span></div><div><strong>{completedSessions}</strong><span>workout days finished</span></div><div><strong>{activeDays}<small>/7</small></strong><span>days with a completed task</span></div></div>
        <div className="hi-chart-controls" role="group" aria-label="Weekly chart measurement"><button aria-pressed={chartMode==='minutes'} onClick={()=>setChartMode('minutes')}>Workout minutes</button><button aria-pressed={chartMode==='tasks'} onClick={()=>setChartMode('tasks')}>Plan tasks</button></div>
        <div className="hi-bars" aria-label="Select a day to inspect its saved plan">{dayStats.map((d,i)=>{const value=chartMode==='minutes'?d.minutes:d.done,total=chartMode==='minutes'?d.planned:d.total;return <button key={d.name} aria-pressed={selected===i} aria-label={d.name+': '+value+' of '+total+' '+(chartMode==='minutes'?'estimated minutes':'tasks')+' complete'} onClick={()=>setSelected(i)}><span className="hi-bar-value">{value}</span><span className="hi-bar-well"><i className="hi-bar-planned" style={{height:total/max*100+'%'}}/><i className="hi-bar-done" style={{height:value/max*100+'%'}}/></span><span>{d.name.slice(0,3)}</span><small>{i===today?'Today':d.rest?'Rest':'\u00a0'}</small></button>})}</div>
        <footer><span><i/>Completed</span><span><i/>Planned</span><small>{weeklyDone} tasks checked this week. Minutes are task estimates, not a timer recording.</small></footer>
      </article>

      <article className="hi-panel hi-fuel">
        <div className="hi-card-filler" aria-hidden="true"><HomeCardArt subject="food"/></div>
        <header><div><span className="hi-eyebrow">{weekDays[selected]} / nutrition</span><h3>Your fuel ledger.</h3></div><Utensils size={22}/></header>
        <div className="hi-energy"><strong>{Math.round(loggedFood.energy)}</strong><span>kcal logged<small>{Math.round(plannedFood.energy)} kcal in the saved plan</small></span></div>
        <div className="hi-macros">{([{key:'protein',label:'Protein'},{key:'carbs',label:'Carbohydrates'},{key:'fat',label:'Fat'}] as const).map(({key,label})=><div key={key} className={'hi-macro '+key}><div><span>{label}</span><b>{round(loggedFood[key])}<small> / {round(plannedFood[key])} g</small></b></div><progress max={plannedFood[key] > 0 ? plannedFood[key] : 1} value={loggedFood[key]} aria-label={label+' logged against saved plan'}/></div>)}</div>
        <div className="hi-meals">{['Breakfast','Lunch','Dinner','Snack'].map(meal=>{const items=foods.filter(f=>'meal' in f&&f.meal===meal);return <div key={meal}><span>{meal}</span><b>{items.filter(i=>i.done).length}/{items.length}</b><small>foods logged</small></div>})}</div>
        <p className="hi-caption">Calculated from the portions you checked off. Planned totals describe your saved menu, not a recommended intake.</p>
      </article>

      <article className="hi-panel hi-session">
        <div className="hi-card-filler" aria-hidden="true"><HomeCardArt subject="movement"/></div>
        <header><div><span className="hi-eyebrow">{weekDays[selected]} / session detail</span><h3>{selectedDay?.workout.rest?'Recovery is on the schedule.':'Your training, unpacked.'}</h3></div><Dumbbell size={22}/></header>
        <div className="hi-session-summary"><span><b>{moves.filter(m=>m.done).length}/{moves.length}</b> exercises done</span><span><b>{actualSets}</b> actual sets logged</span><span><b>{dayStats[selected].planned}</b> estimated planned min</span></div>
        {moves.length ? <div ref={sessionList} className="hi-session-list" tabIndex={0} role="region" aria-label="Planned exercises, scroll for more">{moves.map((item)=>{const exercise='exerciseId' in item?workoutCatalog.find(e=>e.id===item.exerciseId):null;return <div key={item.id}><span className={'hi-task-dot '+(item.done?'done':'')}>{item.done?'\u2713':''}</span><div><strong>{exercise?.name || 'Saved exercise'}</strong><small>{exercise?.target || 'Exercise'} / {exercise?.equipment || 'Equipment not available'}</small></div><span className="hi-session-time">{item.time}</span><span>{'sets' in item ? item.sets+' sets / '+item.target+(item.targetType==='time'?' sec':' reps') : ''}</span></div>})}</div>:<div className="hi-empty-session"><HomeCardArt subject={selectedDay?.workout.rest?'recovery':'movement'}/><p>{selectedDay?.workout.rest?'No workout tasks planned for this rest day.':'No exercises saved for this day yet.'}</p></div>}
        <p className="hi-caption">Read-only snapshot. Times, targets and completion are managed in My Plan.</p>
      </article>

      <article className="hi-panel hi-wellness">
        <div className="hi-card-filler" aria-hidden="true"><HomeCardArt subject="recovery"/></div>
        <header><div><span className="hi-eyebrow">Latest check-in</span><h3>How you arrived matters.</h3></div><Heart size={22}/></header>
        {wellness ? <><p className="hi-log-date">Logged {dateLabel(wellness.date)}</p><dl>{([{key:'energy',label:'Energy',unit:'/5'},{key:'sleepHours',label:'Sleep',unit:'hours'},{key:'soreness',label:'Soreness',unit:'/5'},{key:'rpe',label:'Perceived effort',unit:'/10'}] as const).map(({key,label,unit})=><div key={key}><dt>{label}</dt><dd>{wellness.payload[key] ?? '\u2014'} <small>{wellness.payload[key]===undefined?'Not logged':unit}</small></dd></div>)}</dl><p className="hi-caption">Self-reported in your progress documentation. This is not a readiness score.</p></>:<div className="hi-wellness-empty"><HomeCardArt subject="recovery"/><p>No wellness check-in yet.</p><small>Energy, sleep and effort entries from Documentation will appear here.</small></div>}
      </article>

      <article className="hi-panel hi-trend">
        <div className="hi-card-filler" aria-hidden="true"><HomeCardArt subject="documentation"/></div>
        <header><div><span className="hi-eyebrow">Your documented change</span><h3>A longer view.</h3></div><span className="hi-data-tag">Weight log</span></header>
        {last ? <><div className="hi-weight-number"><strong>{last.payload.weightKg}<small> kg</small></strong><span>{delta===null?'One measurement so far':(delta>0?'+':'')+delta+' kg across the displayed logs'}<small>Latest entry: {dateLabel(last.date)}</small></span></div>{coordinates.length>1?<svg className="hi-weight-chart" viewBox="0 0 300 125" role="img" aria-label="Weight trend across the latest documented measurements"><path d="M15 25H285M15 65H285M15 105H285" stroke="currentColor" opacity=".15"/><polyline points={coordinates.map(p=>p.join(',')).join(' ')} fill="none" stroke="#ef7133" strokeWidth="3"/>{coordinates.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4" fill="#ef7133"><title>{weightLogs[i].date+': '+weightLogs[i].payload.weightKg+' kg'}</title></circle>)}</svg>:<p className="hi-caption">A second dated measurement will start your trend line.</p>}<div className="hi-trend-dates"><span>{dateLabel(first.date)}</span><span>{dateLabel(last.date)}</span></div></>:<div className="hi-trend-empty"><HomeCardArt subject="documentation"/><div><p>No weight measurements recorded yet.</p><small>Your own dated measurements will build this chart. No trend is estimated without logs.</small></div></div>}
        <div className="hi-profile-strip"><span>Onboarding target<b>{profile?.targetWeightKg ? profile.targetWeightKg+' kg':'Not set'}</b></span><span>Selected focus<b>{focus}</b></span></div>
      </article>

      <article className="hi-panel hi-milestones">
        <div className="hi-card-filler" aria-hidden="true"><HomeCardArt subject="achievements"/></div>
        <header><div><span className="hi-eyebrow">Earned, not estimated</span><h3>Milestones in motion.</h3></div><Trophy size={22}/></header>
        <div className="hi-award-count"><strong>{progress ? awards.size : '\u2014'}</strong><span>achievements unlocked<small>{progress?'From your saved account achievements':'Sign in and sync progress to see achievements'}</small></span></div>
        <div className="hi-badges">{milestones.map(m=><div key={m.code} className={awards.has(m.code)?'unlocked':'locked'} title={m.description}><Trophy size={18}/><span>{m.name}</span><small>{awards.has(m.code)?'Unlocked':'Locked'}</small></div>)}</div>
        {nextMilestone&&<p className="hi-next-milestone"><span>A milestone to work toward</span><strong>{nextMilestone.name}</strong><small>{nextMilestone.description}</small></p>}
      </article>
      <div ref={brandFiller} className="hi-brand-space" hidden aria-hidden="true"><img src="/mascot/hero-fox-head.png" alt="" width="160" height="160"/><Wordmark/><small>Move. Fuel. Feel good.</small></div>
    </div>
  </section>
}
