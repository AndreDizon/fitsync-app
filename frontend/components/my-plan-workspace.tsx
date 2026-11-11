'use client'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Check, Droplet, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react'
import { usePlanningProfile } from '@/lib/planning-profile'
import { usePlanAccount } from '@/lib/playlist-account'
import { cachedWeek, reloadWeek, storeWeek, syncWeek, type StoredWeek } from '@/lib/daily-plans'
import { listPlaylists } from '@/lib/playlists'
import { FoodDetails } from './food-library'
import { FoodArt } from './food-art'
import { ExerciseDetails } from './exercise-library'
import { seedExerciseById } from '@/lib/exercise-offline'
import { foodById } from '@/lib/nutrition'
import { currentDay, currentWeek, eligibleFoods, foodCatalog, foodTotals, formulateDay, workoutPhase, planTargets, taskMinutes, weekDays, workoutCatalog, type DaySchedule, type PlanTask, type PlanWeek } from '../../shared/daily-plans'
import { defaultMealTime, newPlaylistItem, playlistMeals, type Playlist, type PlaylistKind } from '../../shared/playlists'
import '@/app/my-plan.css'
import { PlanTimeInput } from './plan-time-input'
import { PlanMetricArt } from './plan-metric-art'
import { HydrationArt } from './hydration-art'

const metricNotes: Record<string, string> = {
  'Movement time': 'Time invested in your movement', Exercises: 'One completed task at a time',
  Energy: 'Fuel for your daily activity', Protein: 'Supports muscle maintenance and repair',
  Carbohydrates: 'Energy for movement and training', Fat: 'Supports cells and nutrient absorption',
}
const number = (n: number | null) => n === null ? 'Not set' : n.toLocaleString('en-US', { maximumFractionDigits: 1 })
export function MyPlanWorkspace({ kind, focusWater = false }: { kind: PlaylistKind; focusWater?: boolean }) {
  const calendarRef = useRef<HTMLDivElement>(null)
  const waterRef = useRef<HTMLElement>(null)
  const todoRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const calendar = calendarRef.current
    const page = calendar?.closest('.content-wrap')
    if (!calendar || !page) return
    const measure = () => {
      for (const section of [calendar, waterRef.current, todoRef.current]) {
        if (section) {
          const bounds = section.getBoundingClientRect(), pageBounds = page.getBoundingClientRect()
          section.style.setProperty('--calendar-bleed', Math.max(0, pageBounds.right - bounds.right) + 'px')
          section.style.setProperty('--calendar-bleed-left', Math.max(0, bounds.left - pageBounds.left) + 'px')
        }
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(page); observer.observe(calendar)
    if (waterRef.current) observer.observe(waterRef.current)
    if (todoRef.current) observer.observe(todoRef.current)
    return () => observer.disconnect()
  })
  const profile = usePlanningProfile(), identity = usePlanAccount(), owner = identity ?? 'local-tester'
  const timeZone = profile?.timeZone || 'Asia/Manila'
  const [week, setWeek] = useState(() => currentWeek(new Date(), timeZone)), [day, setDay] = useState(() => currentDay(new Date(), timeZone))
  useEffect(() => { setWeek(currentWeek(new Date(), timeZone)); setDay(currentDay(new Date(), timeZone)) }, [timeZone])
  const [record, setRecord] = useState<StoredWeek | null>(null), latest = useRef<StoredWeek | null>(null)
  const [message, setMessage] = useState(''), [notes, setNotes] = useState<string[]>([]), [busy, setBusy] = useState(false)
  const [chooser, setChooser] = useState<{ replace?: string } | null>(null), [query, setQuery] = useState(''), [detail, setDetail] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDialogElement | null>(null)
  const pickerSearchRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (!chooser) return
    const dialog = pickerRef.current
    dialog?.showModal()
    const frame = requestAnimationFrame(() => pickerSearchRef.current?.focus({ preventScroll: true }))
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { cancelAnimationFrame(frame); dialog?.close(); document.body.style.overflow = previousOverflow }
  }, [chooser])
  const waterFocused = useRef(false)
  useEffect(() => {
    if (!focusWater || !record || waterFocused.current) return
    waterFocused.current = true
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById('my-plan-water-title')
      heading?.scrollIntoView({ block: 'center', behavior: 'instant' })
      heading?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [focusWater, !!record])
  const [imports, setImports] = useState<Playlist[] | null>(null)
  const generation = useRef(0)
  const nutrition = kind === 'nutrition'
  latest.current = record
  useEffect(() => {
    let active = true
    const initialRest = (record: StoredWeek) => {
      for (let i = 0; i < 7; i++) if (profile && record.document.days[i].workout.source === 'Not planned') { record.document.days[i].workout.rest = !profile.days.some(name => name.slice(0,3).toLowerCase() === weekDays[i].slice(0,3).toLowerCase()); record.document.days[i].workout.source = 'Onboarding schedule' }
      return record
    }
    const refresh = () => { if (active) { const cached = initialRest(cachedWeek(owner, week)); setRecord(cached); void syncWeek(owner, week).then(value => { if (active) setRecord(initialRest(value)) }) } }
    refresh(); window.addEventListener('online', refresh)
    const midnight = setInterval(() => { const next = currentWeek(new Date(), timeZone); if (next !== week) setWeek(next) }, 60000)
    return () => { active = false; clearInterval(midnight); window.removeEventListener('online', refresh) }
  }, [owner, week, profile])
  useEffect(() => {
    if (!record?.pending || record.conflict || !identity) return
    let active = true
    const timer = setTimeout(() => { void syncWeek(owner, week).then(value => { if (active) setRecord(value) }) }, 700)
    return () => { active = false; clearTimeout(timer) }
  }, [record?.token, identity, owner, week, record?.pending, record?.conflict])
  useEffect(() => { generation.current++; setBusy(false); setChooser(null); setImports(null); setDetail(null); setMessage(''); setNotes([]); return () => { generation.current++ } }, [kind, day])
  function commit(change: (next: PlanWeek) => void) {
    const current = latest.current
    if (!current) return
    if (current.conflict) return setMessage('Resolve the account sync conflict before changing this week.')
    try { const next = structuredClone(current.document); change(next); const saved = storeWeek(owner, next, current.token); latest.current = saved; setRecord(saved); setMessage('') }
    catch (error) { setMessage((error as Error).message) }
  }
  function setSchedule(schedule: DaySchedule) { setNotes([]); commit(next => { next.days[day][kind] = schedule }) }
  function patch(id: string, changes: Partial<PlanTask>) { commit(next => { const schedule = next.days[day][kind]; schedule.items = schedule.items.map(item => item.id === id ? { ...item, ...changes } as PlanTask : item); schedule.source = 'Customized' }) }
  if (!record) return <div className="my-plan-loading" role="status">Opening your week…</div>
  const today = record.document.days[day], schedule = today[kind], completed = schedule.items.filter(item => item.done)
  const targets = planTargets(profile, today.workout.rest), planned = foodTotals(schedule.items), eaten = foodTotals(completed)
  const minutes = schedule.items.reduce((sum, item) => sum + taskMinutes(item), 0), doneMinutes = completed.reduce((sum, item) => sum + taskMinutes(item), 0)
  const waterDone = today.water.filter(glass => glass.done).length
  const catalog = nutrition ? foodCatalog.map(food => ({ id: food.id, name: food.name, meta: food.category })) : workoutCatalog.map(exercise => ({ id: exercise.id, name: exercise.name, meta: exercise.target + ' · ' + exercise.equipment }))
  const matches = catalog.filter(item => (item.name + ' ' + item.meta).toLowerCase().includes(query.trim().toLowerCase()))
  const nameOf = (item: PlanTask) => 'foodId' in item ? foodCatalog.find(food => food.id === item.foodId)?.name ?? 'Food' : workoutCatalog.find(exercise => exercise.id === item.exerciseId)?.name ?? 'Exercise'
  const taskGroups = nutrition ? [...new Set(schedule.items.flatMap(item => 'foodId' in item ? [item.meal + '|' + item.time] : []))].sort((a,b) => a.split('|')[1].localeCompare(b.split('|')[1])).map(key => ({ key, title: key.split('|')[0] + ' - ' + key.split('|')[1], items: schedule.items.filter(item => 'foodId' in item && item.meal + '|' + item.time === key) })) : schedule.items.reduce<{ key: string; title: string; items: PlanTask[] }[]>((groups,item) => { const title = workoutPhase(item), last = groups[groups.length-1]; if(last?.title === title) last.items.push(item); else groups.push({key: item.id, title, items:[item]}); return groups }, [])
  const allowOverwrite = () => !schedule.items.length && !schedule.rest || window.confirm('Replace ' + weekDays[day] + ' ' + kind + ' tasks? Completion marks for replaced tasks will reset. Water and the other plan type will stay unchanged.')
  async function generate(single?: PlanTask) {
    if (!profile) return setMessage('Finish onboarding to formulate a personal day.')
    if (!single && !allowOverwrite()) return
    const run = ++generation.current
    setBusy(true); setMessage(''); setNotes([])
    try {
      const variation = Math.min(100000, schedule.variation + 1)
      const exclude = single ? schedule.items.map(item => 'foodId' in item ? item.foodId : item.exerciseId) : []
      // The same deterministic engine and seeded catalogs run on either side.
      // Account storage still validates every task and derives its owner from the session.
      const result = formulateDay(profile, kind, day, variation, exclude, !!single)
      if (generation.current !== run) return
      if (single) {
        let alternative = result.schedule.items.find(item => ('foodId' in single) === ('foodId' in item))
        if (nutrition && profile && 'foodId' in single) {
          const original = foodCatalog.find(food => food.id === single.foodId)
          const options = eligibleFoods(profile).filter(food => food.category === original?.category && !exclude.includes(food.id))
          if (options.length) alternative = { ...newPlaylistItem('nutrition', options[variation % options.length].id, day), done: false }
          else alternative = undefined
        }
        if (!alternative) throw new Error('No other matching option is available. Use Choose from library to select manually.')
        const replacement = { ...alternative, id: single.id, time: single.time, done: false, ...('foodId' in single && 'foodId' in alternative ? { grams: single.grams, meal: single.meal } : {}) }
        commit(next => { next.days[day][kind].items = next.days[day][kind].items.map(item => item.id === single.id ? replacement : item); next.days[day][kind].variation = variation; next.days[day][kind].source = 'Customized system plan' })
      } else setSchedule(result.schedule)
      setNotes(result.notes)
    } catch (error) { if (generation.current === run) setMessage((error as Error).message) } finally { if (generation.current === run) setBusy(false) }
  }
  function choose(id: string) {
    if (schedule.items.length >= 60 && !chooser?.replace) return setMessage('A day supports up to 60 tasks.')
    const entry = newPlaylistItem(kind, id, day)
    const previous = schedule.items.find(item => item.id === chooser?.replace)
    const task: PlanTask = { ...entry, done: false, ...(previous ? { id: previous.id, time: previous.time } : {}) }
    commit(next => { const dest = next.days[day][kind]; dest.rest = false; dest.source = 'Manual'; dest.items = previous ? dest.items.map(item => item.id === previous.id ? task : item) : [...dest.items, task] })
    setChooser(null); setNotes([])
  }
  async function importList() { setBusy(true); try { setImports(await listPlaylists(kind)) } catch (error) { setMessage((error as Error).message) } finally { setBusy(false) } }
  function usePlaylist(playlist: Playlist) {
    if (!window.confirm(playlist.duration === 'week' ? 'Replace this week’s ' + kind + ' schedule with this playlist? Completion marks will reset.' : 'Replace ' + weekDays[day] + ' with this one-day playlist? Completion marks will reset.')) return
    if (playlist.items.some(item => playlist.items.filter(other => other.day === item.day).length > 60)) return setMessage('This playlist has more than 60 entries in a day. Reduce it before importing.')
    commit(next => {
      const dates = playlist.duration === 'week' ? [0,1,2,3,4,5,6] : [day]
      for (const destination of dates) {
        const source = playlist.duration === 'week' ? destination : playlist.selectedDay
        next.days[destination][kind] = { items: playlist.items.filter(item => item.day === source).map(item => ({ ...item, id: crypto.randomUUID(), day: destination, done: false })), rest: kind === 'workout' && playlist.restDays.includes(source), source: 'Playlist: ' + playlist.name, variation: 0 }
      }
    }); setImports(null); setNotes([])
  }
  const stats = nutrition ? [
    { name: 'Energy', done: eaten.energy, target: targets.energy, planned: planned.energy, unit: 'kcal' },
    { name: 'Protein', done: eaten.protein, target: targets.protein, planned: planned.protein, unit: 'g' },
    { name: 'Carbohydrates', done: eaten.carbs, target: targets.carbs, planned: planned.carbs, unit: 'g' },
    { name: 'Fat', done: eaten.fat, target: targets.fat, planned: planned.fat, unit: 'g' },
  ] : [ { name: 'Movement time', done: doneMinutes, target: targets.minutes, planned: minutes, unit: 'min' }, { name: 'Exercises', done: completed.length, target: schedule.items.length, planned: schedule.items.length, unit: 'tasks' } ]
  return <section className={'my-plan-workspace ' + kind} aria-label={nutrition ? 'My nutrition plan' : 'My workout plan'}>
    <header className="my-plan-heading plan-tab-page-heading"><div><p className="eyebrow">YOUR WEEK</p><h2>{nutrition ? 'Nourishment, one day at a time.' : 'Your day. Your next move.'}</h2><p>Mark a task done to update your daily totals.</p></div><span className="my-plan-sync">{!identity ? '' : record.conflict ? 'Sync conflict' : record.error ? 'Device copy · sync unavailable' : record.pending ? 'Saved on device · pending sync' : record.document.revision ? 'Synced to account' : 'Ready to plan'}</span></header>
    {record.error && <div className="my-plan-warning" role="status">{record.error}{record.conflict && <button onClick={async () => { if (window.confirm('Discard this device’s unsynced changes and reload the account week?')) { try { setRecord(await reloadWeek(owner, week)) } catch (error) { setMessage((error as Error).message) } } }}>Reload account week</button>}</div>}
    {message && <p className="my-plan-warning" role="alert">{message}</p>}
    <section className="my-plan-stats" aria-label="Daily targets">{stats.map(stat => <article key={stat.name} data-metric={stat.name}><PlanMetricArt name={stat.name}/><span>{stat.name}</span><small className="plan-metric-purpose">{metricNotes[stat.name]}</small><strong><b className="plan-metric-number">{number(stat.done)}</b> <small>/ {number(stat.target)} {stat.unit}</small></strong><div className="plan-metric-track-label"><span>Completed</span><b>{stat.target ? Math.round(stat.done / stat.target * 100) : 0}%</b></div><progress aria-label={stat.name + ' completed'} value={stat.done} max={stat.target || 1} /><p>Planned: {number(stat.planned)} {stat.unit}{stat.target !== null && stat.target > 0 ? ' · Left: ' + number(Math.max(0, stat.target - stat.done)) : ''}</p></article>)}</section>
    <details className="my-plan-method"><summary>How your targets are calculated</summary><p>{nutrition && targets.energyRange ? 'Estimated energy range: ' + targets.energyRange.join('–') + ' kcal/day. ' : ''}{targets.notes.join(' ')}</p><p>Exercise time uses sets, reps or timed work and between-set rest; it is an estimate, not measured activity. Library information stays unchanged.</p><a href="https://www.sciencedirect.com/science/article/pii/S0002916523166986" target="_blank" rel="noreferrer">Energy equation</a> · <a href="https://www.cdc.gov/physical-activity-basics/guidelines/adults.html" target="_blank" rel="noreferrer">Activity guidance</a></details>
    <div ref={calendarRef} className="my-plan-calendar-section"><nav className="my-plan-days" aria-label="Choose plan day">{weekDays.map((name, index) => <button key={name} data-today={week === currentWeek(new Date(), timeZone) && index === currentDay(new Date(), timeZone)} data-rest={kind === 'workout' && record.document.days[index].workout.rest} aria-pressed={day === index} onClick={() => setDay(index)}><span className="my-plan-calendar-name">{name}</span><small>{kind === 'workout' && record.document.days[index].workout.rest ? 'Rest day' : record.document.days[index][kind].items.filter(item => item.done).length + '/' + record.document.days[index][kind].items.length + ' done'}</small></button>)}</nav></div>
    <section ref={todoRef} className="my-plan-todo" aria-labelledby="my-plan-day-title"><div className="my-plan-day-top"><div><h3 id="my-plan-day-title">{weekDays[day]} {nutrition ? 'menu' : 'movement'}</h3><p>{schedule.source} · {completed.length}/{schedule.items.length} done</p></div>{!nutrition && <label><input type="checkbox" checked={schedule.rest} disabled={busy} onChange={event => { if (event.target.checked && schedule.items.length && !window.confirm('Set this day to rest and remove its exercises?')) return; setSchedule({ ...schedule, rest: event.target.checked, items: event.target.checked ? [] : schedule.items, source: 'Manual' }) }} />Rest day</label>}</div>
      <div className="my-plan-options"><button className="my-plan-generate" disabled={busy || !profile} onClick={() => generate()}><Sparkles size={16} />{schedule.items.length ? 'Regenerate day' : 'Formulate my day'}</button><button disabled={busy} onClick={importList}>Use a playlist</button><button disabled={busy} onClick={() => { setChooser({}); setQuery('') }}><Plus size={15} />Choose from library</button></div>
      <p className="my-plan-hint">Smart suggestions use your onboarding preferences and calculations, not generative AI. Or build your own day from a playlist or the library.</p>
      {busy && <div className="my-plan-formulating" role="status"><span /><span /><span />Preparing your options…</div>}
      {notes.length > 0 && <div className="my-plan-notes">{notes.map(note => <p key={note}>{note}</p>)}</div>}
      {imports && <section className="my-plan-picker" aria-label="Import a playlist"><header><h4>Choose a playlist</h4><button aria-label="Close playlist import" onClick={() => setImports(null)}><X size={17} /></button></header><p>One day goes to {weekDays[day]}; a full week replaces Monday–Sunday. Water and the other plan type stay as they are.</p>{!imports.length ? <p>No saved {kind} playlists yet. Create one in the Playlist tab.</p> : imports.map(playlist => <button key={playlist.id} onClick={() => usePlaylist(playlist)}>{playlist.name}<small>{playlist.duration === 'week' ? 'One week' : weekDays[playlist.selectedDay] + ' · one day'} · {playlist.items.length} items</small></button>)}</section>}
      {chooser && <dialog ref={pickerRef} className="my-plan-picker my-plan-picker-dialog" aria-label="Choose plan library item" onCancel={() => setChooser(null)} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setChooser(null) } }}><header><h4>{chooser.replace ? 'Replace this task' : 'Add a task'}</h4><button aria-label="Close plan library picker" onClick={() => setChooser(null)}><X size={17} /></button></header><input ref={pickerSearchRef} aria-label="Search plan library" placeholder={nutrition ? 'Search foods' : 'Search exercises'} value={query} onChange={event => setQuery(event.target.value)} /><div className="my-plan-picker-items">{matches.map(item => <article key={item.id}><div><strong>{item.name}</strong><small>{item.meta}</small><button onClick={() => setDetail(item.id)}>View details</button></div><button onClick={() => choose(item.id)}>{chooser.replace ? 'Use instead' : 'Add'}</button></article>)}</div>{!matches.length && <p>No matching items.</p>}</dialog>}
      {!schedule.items.length ? <div className="my-plan-empty">{schedule.rest && !nutrition ? 'A recovery day from your schedule. Your water goal still applies.' : 'Your to-do list is empty. Formulate a day, use a playlist, or choose from the library.'}</div> : <div className="my-plan-task-groups">{!nutrition && !schedule.rest && <aside className="my-plan-preparation"><strong>Before you start &middot; 4-minute warm-up</strong><p>Begin with easy movement and comfortable practice repetitions. Use easy movement and light practice sets before your planned working sets.</p><small>Generated plans reserve one-minute transitions between exercises. Follow the rest shown on each task between sets; adjust manual schedules to allow preparation and recovery.</small></aside>}{taskGroups.map(group => { const totals = foodTotals(group.items), allDone = group.items.every(item => item.done); return <Fragment key={group.key}>{!nutrition && <header className="my-plan-meal-heading my-plan-workout-heading"><div><h4>{group.title}</h4></div></header>}{nutrition && <header className="my-plan-meal-heading"><div><h4>{group.title}</h4><p>{group.items.filter(item => item.done).length}/{group.items.length} ingredients done &middot; {number(totals.energy)} kcal &middot; {number(totals.protein)} g protein &middot; {number(totals.carbs)} g carbs &middot; {number(totals.fat)} g fat</p></div><button disabled={busy} onClick={() => commit(next => { const ids = new Set(group.items.map(item => item.id)); next.days[day][kind].items = next.days[day][kind].items.map(item => ids.has(item.id) ? { ...item, done: !allDone } : item) })}>{allDone ? 'Undo meal' : 'Mark meal done'}</button></header>}<div className="my-plan-task-list">{group.items.map(item => { const name = nameOf(item), id = 'foodId' in item ? item.foodId : item.exerciseId; const food = 'foodId' in item ? foodById(item.foodId) : null; const allergens = food?.allergens.filter(value => profile?.allergies.includes(value)) ?? []; return <article key={item.id} className={item.done ? 'is-done' : ''}><div className="my-plan-timeline-rail"><label>Time<PlanTimeInput label={'Plan time for ' + name} value={item.time} disabled={busy} onChange={time => patch(item.id, { time })} /></label><button type="button" className="my-plan-check" aria-label={(item.done ? 'Undo completion for ' : 'Mark done: ') + name} aria-pressed={item.done} disabled={busy} onClick={() => patch(item.id, { done: !item.done })}>Done</button></div><div className="my-plan-task-card"><div className="my-plan-task-main"><div className="my-plan-task-heading"><button type="button" className="my-plan-task-thumbnail" aria-label={'View details for ' + name} onClick={() => setDetail(id)}>{food ? <FoodArt id={food.id} category={food.category} /> : <img src={'/exercises/' + id + '.webp'} width={64} height={64} alt="" loading="lazy" decoding="async" />}</button><div><strong>{name}</strong>{food && <p className="my-plan-task-state">{food.state} &middot; edible weight</p>}</div></div>{allergens.length > 0 && <p className="my-plan-task-allergen">Matches your listed allergy: {allergens.join(', ')}. Choose a replacement.</p>}<div className="my-plan-task-fields">{'foodId' in item ? <><label>Edible grams<input type="number" min={1} max={2000} aria-label={'Plan grams for ' + name} value={item.grams} onChange={event => { const grams = Number(event.target.value); if (grams >= 1 && grams <= 2000) patch(item.id, { grams, done: false }) }} /></label><label>Meal<select aria-label={'Plan meal for ' + name} value={item.meal} onChange={event => patch(item.id, { meal: event.target.value as typeof item.meal, done: false, ...(item.time === defaultMealTime(item.meal) ? { time: defaultMealTime(event.target.value) } : {}) })}>{playlistMeals.map(meal => <option key={meal}>{meal}</option>)}</select></label></> : <><label>Sets<input type="number" min={1} max={20} value={item.sets} aria-label={'Plan sets for ' + name} onChange={event => { const sets = Number(event.target.value); if (sets >= 1 && sets <= 20) patch(item.id, { sets, done: false }) }} /></label><label>{item.targetType === 'reps' ? 'Reps / set' : 'Seconds / set'}<input type="number" min={1} max={item.targetType === 'reps' ? 100 : 3600} value={item.target} aria-label={'Plan target for ' + name} onChange={event => { const target = Number(event.target.value); if (target >= 1 && target <= (item.targetType === 'reps' ? 100 : 3600)) patch(item.id, { target, done: false }) }} /></label></>}</div>{'exerciseId' in item && <details className="my-plan-actual-log"><summary>Log actual sets <span>{item.actualSets?.length || 0} recorded &middot; {item.restSeconds}s rest between planned sets</span></summary><p>Record what you actually completed. Weight is in kg; use 0 for bodyweight. Planned targets stay unchanged.</p>{(item.actualSets || []).map((set, index) => <div key={index}><span>Set {index + 1}</span><label>{item.targetType === 'time' ? 'Seconds' : 'Reps'}<input type="number" min={0} max={item.targetType === 'time' ? 3600 : 100} value={set.amount} onChange={event => { const amount = Number(event.target.value); if (Number.isInteger(amount) && amount >= 0 && amount <= (item.targetType === 'time' ? 3600 : 100)) patch(item.id, { actualSets: item.actualSets!.map((row,i) => i === index ? { ...row, amount } : row) }) }} /></label><label>Weight (kg)<input type="number" min={0} max={1000} step="0.25" value={set.weightKg} onChange={event => { const weightKg = Number(event.target.value); if (Number.isFinite(weightKg) && weightKg >= 0 && weightKg <= 1000) patch(item.id, { actualSets: item.actualSets!.map((row,i) => i === index ? { ...row, weightKg } : row) }) }} /></label><button aria-label={'Remove actual set ' + (index + 1) + ' for ' + name} onClick={() => patch(item.id, { actualSets: item.actualSets!.filter((_,i) => i !== index) })}><Trash2 size={14} /></button></div>)}<button disabled={busy || (item.actualSets?.length || 0) >= 20} onClick={() => patch(item.id, { actualSets: [...(item.actualSets || []), { amount: item.target, weightKg: 0 }] })}>+ Add completed set</button></details>}<div className="my-plan-task-links"><button onClick={() => setDetail(id)}>View details</button>{'exerciseId' in item && <span className="my-plan-rest-label">Rest {item.restSeconds}s between sets</span>}<button disabled={busy} onClick={() => { setChooser({ replace: item.id }); setQuery('') }}>Choose replacement</button><button disabled={busy} onClick={() => generate(item)}>Suggest alternative</button></div></div><button className="my-plan-remove" aria-label={'Delete task ' + name} disabled={busy} onClick={() => commit(next => { next.days[day][kind].items = next.days[day][kind].items.filter(task => task.id !== item.id) })}><Trash2 size={16} /></button></div></article> })}</div></Fragment> })}{!nutrition && schedule.source.toLowerCase().includes('system') && <aside className="my-plan-preparation"><strong>Finish &middot; 3-minute cooldown</strong><p>Gradually reduce your pace, breathe comfortably and finish with gentle movement.</p></aside>}</div>}
    </section>
    <section ref={waterRef} className="my-plan-water" aria-labelledby="my-plan-water-title"><HydrationArt/><div><div><p className="eyebrow">DAILY WATER CHECK</p><h3 id="my-plan-water-title" tabIndex={-1}>{waterDone} / 8 glasses</h3><p>App goal: eight 250 ml glasses. Adjust to your needs and any clinician advice.</p></div><button onClick={() => commit(next => { next.days[day].water = next.days[day].water.map(glass => ({ ...glass, done: waterDone !== 8 })) })}><Check size={16} />{waterDone === 8 ? 'Undo all' : 'Mark all done'}</button></div><div className="my-plan-water-grid">{today.water.map((glass, index) => <label key={index} className={glass.done ? 'is-done' : ''}><span><input type="checkbox" aria-label={'Glass ' + (index + 1) + ' done'} checked={glass.done} onChange={event => commit(next => { next.days[day].water[index].done = event.target.checked })} /><Droplet size={18} fill={glass.done ? 'currentColor' : 'none'} /><b className="water-checkpoint-number">{index + 1}</b></span><PlanTimeInput label={'Water time ' + (index + 1)} value={glass.time} onChange={time => commit(next => { next.days[day].water[index].time = time })} /></label>)}</div></section>
    {detail && nutrition && foodById(detail) && <FoodDetails food={foodById(detail)!} onClose={() => setDetail(null)} />}
    {detail && !nutrition && seedExerciseById(detail) && <ExerciseDetails exercise={seedExerciseById(detail)!} onClose={() => setDetail(null)} />}
  </section>
}

