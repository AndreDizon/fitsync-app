'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Dumbbell, Search, SlidersHorizontal, X, Check, ChevronDown } from 'lucide-react'
import '@/app/exercise-library.css'
import { OfflineLibraryStatus } from '@/components/offline-library-status'
import { loadExerciseCatalog, type SeedExercise, type ExerciseGoal } from '@/lib/exercise-offline'
import { usePlanningProfile } from '@/lib/planning-profile'

type Exercise = SeedExercise
type FilterKey = 'category' | 'target_muscle' | 'difficulty' | 'movementPattern'
type Catalog = {
  data: Exercise[]; total: number; catalogTotal: number; page: number; totalPages: number;
  facets: Record<FilterKey | 'equipment' | 'group', string[]>;
  facetCounts: Record<FilterKey | 'equipment' | 'group', Record<string, number>>;
  source: { groups: Record<string, number> };
}
const filterLabels: Record<FilterKey, string> = { target_muscle: 'Primary muscle', difficulty: 'Level', movementPattern: 'Movement', category: 'Exercise type' }
const emptyFilters: Record<FilterKey, string> = { category: '', target_muscle: '', difficulty: '', movementPattern: '' }
const displayLabel = (value: string) => value.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

function ExerciseMedia({ exercise, animated = false }: { exercise: Exercise; animated?: boolean }) {
  const [failed, setFailed] = useState(false)
  const src = animated ? exercise.media_urls[0] : exercise.image_url
  return <div className={`exercise-library-media ${animated ? 'is-demonstration' : ''}`}>
    {src && !failed ? <img src={src} alt={`${exercise.name} demonstration`} loading={animated ? 'eager' : 'lazy'} onError={() => setFailed(true)} /> : <div className="exercise-media-unavailable"><Dumbbell size={32} /><span>Demonstration unavailable</span></div>}
  </div>
}

function ExerciseDetails({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const profile = usePlanningProfile()
  const dialog = useRef<HTMLDialogElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [goal, setGoal] = useState<ExerciseGoal>(profile?.goal ?? 'general_fitness')
  const [weight, setWeight] = useState(profile?.weightKg ?? '')
  const estimates = exercise.estimates
  const enteredWeight = Number(weight)
  const validWeight = weight !== '' && Number.isFinite(enteredWeight) && enteredWeight >= 20 && enteredWeight <= 350
  const referenceWeight = validWeight ? enteredWeight : 70
  const burn = estimates?.estimatedBurnKcalAt70Kg.map(value => Math.round(value * referenceWeight / 70))
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    return () => { document.body.style.overflow = previousOverflow }
  }, [])
  const instructions = exercise.instructions ?? []
  const close = () => { dialog.current?.close(); onClose() }
  return <dialog ref={dialog} className="exercise-detail-dialog" aria-labelledby="exercise-detail-title" onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close() } }}>
    <div className="exercise-detail-header"><div><p className="eyebrow">MOVE WITH CONFIDENCE</p><h2 id="exercise-detail-title">{exercise.name}</h2></div><button className="exercise-close" onClick={close} aria-label="Close exercise details" autoFocus><X size={20} /></button></div>
    <div className="exercise-detail-body">
      <ExerciseMedia key={String(animate)} exercise={exercise} animated={animate} />
      {exercise.media_urls.length > 0 && <button className="exercise-animation-toggle" aria-pressed={animate} onClick={() => setAnimate(!animate)}>{animate ? 'Pause demonstration' : 'Play demonstration'}</button>}
      <dl className="exercise-metadata">{[
        ['Target muscle', exercise.target_muscle], ['Equipment', exercise.equipment],
        ['Category', exercise.category], ['Body part', exercise.body_part],
        ['Difficulty', exercise.difficulty], ['Movement', exercise.movementPattern],
        ...(exercise.secondary_muscles.length ? [['Secondary muscles', exercise.secondary_muscles.join(', ')]] : []),
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="exercise-default-target"><span>Suggested starting target</span><strong>{exercise.defaultTarget}</strong></div>
      {estimates && <section className="exercise-estimates" aria-labelledby="exercise-estimates-title">
        <h3 id="exercise-estimates-title">Plan your effort</h3>
        <div className="exercise-estimate-controls">
          <label>Goal preview<select value={goal} onChange={event => setGoal(event.target.value as ExerciseGoal)}>{Object.entries(estimates.goals).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
          <label>Weight in kg (optional)<input type="number" inputMode="decimal" min="20" max="350" step="0.1" placeholder="70 kg reference" value={weight} onChange={event => setWeight(event.target.value)} aria-invalid={weight !== '' && !validWeight} /></label>
        </div>
        {weight !== '' && !validWeight && <p role="status">Enter 20–350 kg to adjust the estimate. Showing the 70 kg reference for now.</p>}
        <dl><div><dt>Estimated time</dt><dd>{estimates.estimatedMinutes.join('–')} min</dd></div><div><dt>Estimated burn</dt><dd>{burn?.join('–')} kcal</dd></div></dl>
        <p>For {estimates.prescription.toLowerCase()}, including between-set rest; setup and warm-up excluded. Burn uses {referenceWeight} kg{validWeight ? ' entered weight' : ' as an example, not your profile'}.</p>
        <p className="exercise-goal-benefit">{estimates.goals[goal].benefit}</p>
        <small>Planning estimates, not measured results. Burn includes resting energy; pace, load and rest change it. Muscle or body-weight gain cannot be predicted per exercise. Changes here are previews. Edit your saved goal and weight in Settings → Goals & planning preferences. Based on activity classes in the <a href="https://pacompendium.com/" target="_blank" rel="noreferrer">Physical Activity Compendium</a>.</small>
      </section>}
      <section className="exercise-instructions"><h3>Instructions</h3>
        <ol id="exercise-guidance">{(expanded ? instructions : instructions.slice(0, 3)).map((text, index) => <li key={index}>{text}</li>)}</ol>
        {instructions.length > 3 && <button className="exercise-read-more" aria-expanded={expanded} aria-controls="exercise-guidance" onClick={() => setExpanded(!expanded)}>{expanded ? 'Read less' : 'Read more…'}</button>}
      </section>
      <aside className="exercise-coach-tip"><div><img src="/mascot/fox-logo.png" alt="" width={32} height={32} /><h3>Your fox coach says</h3></div><p>{exercise.coachTip}</p></aside>
      <p className="exercise-source-credit">Guidance: FitSync. Demonstration media: <a href="https://github.com/JahelCuadrado/ExerciseGymGifsDB" target="_blank" rel="noreferrer">JahelCuadrado / ExerciseGymGifsDB</a>{exercise.source_media_url && <> · <a href={exercise.source_media_url} target="_blank" rel="noreferrer">Original demonstration</a></>}</p>
    </div>
  </dialog>
}

export function ExerciseLibrary() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<FilterKey, string>>(emptyFilters)
  const [equipment, setEquipment] = useState<string[]>([])
  const [group, setGroup] = useState('')
  const [sort, setSort] = useState('relevance')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Catalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const results = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (selected || !trigger.current) return
    const original = trigger.current
    const current = original.isConnected ? original : document.querySelector<HTMLButtonElement>(`.exercise-view-details[data-exercise-id="${original.dataset.exerciseId}"]`)
    current?.focus()
  }, [selected])
  useEffect(() => { const timeout = setTimeout(() => { if (query.trim() !== search) { setSearch(query.trim()); setPage(1) } }, 250); return () => clearTimeout(timeout) }, [query, search])
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ q: search, page: String(page), pageSize: '24', group, sort, ...filters })
    equipment.forEach(value => params.append('equipment', value))
    setLoading(true); setError('')
    loadExerciseCatalog(params, controller.signal).then(result => {
      if (!Array.isArray(result.data) || !result.facets || !result.facetCounts) throw new Error('The library returned an unexpected response.')
      if (!controller.signal.aborted) setData(result)
    }).catch(err => { if (!controller.signal.aborted) setError(err.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [search, filters, equipment, group, sort, page, retry])
  const reset = () => { setQuery(''); setSearch(''); setFilters(emptyFilters); setEquipment([]); setGroup(''); setPage(1) }
  const clearSearch = () => { setQuery(''); setSearch(''); setPage(1) }
  const setFilter = (key: FilterKey, value: string) => { setFilters(previous => ({ ...previous, [key]: value })); setPage(1) }
  const toggleEquipment = (value: string) => { setEquipment(previous => previous.includes(value) ? previous.filter(item => item !== value) : [...previous, value]); setPage(1) }
  const open = (exercise: Exercise, button: HTMLButtonElement) => { trigger.current = button; setSelected(exercise) }
  const close = () => setSelected(null)
  const changePage = (next: number) => { setPage(next); results.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) }
  const advancedCount = Object.values(filters).filter(Boolean).length
  const count = advancedCount + equipment.length + Number(!!group) + Number(!!query.trim())
  const pending = loading || downloading || query.trim() !== search
  const equipmentOptions = data?.facets.equipment ?? []
  const allGroupCount = Object.values(data?.facetCounts.group ?? {}).reduce((sum, number) => sum + number, 0)
  return <div className="page library-page exercise-library-page">
    <p className="eyebrow">YOUR LIBRARY</p><h1>Find your next move</h1><p className="muted intro">100 essentials. Find your focus, pick your equipment, and make your next move count.</p>
    <OfflineLibraryStatus onDownloadingChange={setDownloading} />
    <section className="exercise-filter-studio" aria-label="Find exercises">
      <div className="exercise-search-row">
        <div className="exercise-search-field"><Search size={20} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Try bench press, DB row, or abs…" aria-label="Search exercises" autoComplete="off" spellCheck={false} />{query && <button onClick={clearSearch} aria-label="Clear exercise search"><X size={17} /></button>}</div>
        <label className="exercise-sort"><span>Sort</span><select value={sort} aria-label="Sort exercises" onChange={event => { setSort(event.target.value); setPage(1) }}><option value="relevance">Best match</option><option value="name">Name: A–Z</option><option value="name-desc">Name: Z–A</option><option value="beginner">Beginner first</option></select></label>
      </div>
      <div className="exercise-focus-heading"><span>YOUR FOCUS</span><span>Choose an area to explore</span></div>
      <div className="exercise-focus-filters" role="group" aria-label="Exercise focus"><button aria-pressed={!group} onClick={() => { setGroup(''); setPage(1) }}>All <span>{data ? allGroupCount : 100}</span></button>{Object.entries(data?.source.groups ?? {}).map(([name]) => {
        const available = data?.facetCounts.group[name] ?? 0
        return <button key={name} aria-pressed={group === name} disabled={!available && group !== name} onClick={() => { setGroup(group === name ? '' : name); setPage(1) }}>{name} <span>{available}</span></button>
      })}</div>
      <div className="exercise-equipment-heading"><Dumbbell size={16} aria-hidden="true" /><span>Available equipment</span><small>Select one or more</small></div>
      <div className="exercise-equipment-options" role="group" aria-label="Available equipment"><button aria-pressed={!equipment.length} onClick={() => { setEquipment([]); setPage(1) }}>Any equipment</button>{equipmentOptions.map(value => {
        const active = equipment.includes(value), available = data?.facetCounts.equipment[value] ?? 0
        return <button key={value} aria-pressed={active} disabled={!active && !available} onClick={() => toggleEquipment(value)}>{active && <Check size={13} aria-hidden="true" />}{displayLabel(value)} <span>{available}</span></button>
      })}</div>
      <details className="exercise-more-filters"><summary><SlidersHorizontal size={16} aria-hidden="true" />More filters {advancedCount > 0 && <span className="exercise-filter-badge">{advancedCount}</span>}<ChevronDown size={16} className="exercise-filter-chevron" aria-hidden="true" /></summary>
        <div className="exercise-advanced-grid">{(Object.keys(filterLabels) as FilterKey[]).map(key => <label key={key}><span>{filterLabels[key]}</span><select value={filters[key]} onChange={event => setFilter(key, event.target.value)} aria-label={`Filter by ${filterLabels[key].toLowerCase()}`}><option value="">Any {filterLabels[key].toLowerCase()}</option>{(data?.facets[key] ?? []).map(value => { const available = data?.facetCounts[key][value] ?? 0; return <option key={value} value={value} disabled={!available && filters[key] !== value}>{displayLabel(value)} ({available})</option> })}</select></label>)}</div>
      </details>
      {count > 0 && <div className="exercise-active-filters" aria-label="Active exercise filters"><span className="exercise-active-label">Active {count}</span>
        {query.trim() && <button onClick={clearSearch} aria-label="Remove search filter">“{query.trim()}” <X size={12} /></button>}
        {group && <button onClick={() => { setGroup(''); setPage(1) }} aria-label={`Remove ${group} filter`}>{group}<X size={12} /></button>}
        {equipment.map(value => <button key={value} onClick={() => toggleEquipment(value)} aria-label={`Remove ${value} filter`}>{displayLabel(value)}<X size={12} /></button>)}
        {(Object.keys(filterLabels) as FilterKey[]).filter(key => filters[key]).map(key => <button key={key} onClick={() => setFilter(key, '')} aria-label={`Remove ${filterLabels[key].toLowerCase()} filter`}>{displayLabel(filters[key])}<X size={12} /></button>)}
        <button className="exercise-reset-filters" onClick={reset}>Clear all</button>
      </div>}
    </section>
    <div className="exercise-results-heading" ref={results}><p role="status">{pending ? 'Finding your next move…' : error ? 'Library unavailable' : <><strong>{data?.total ?? 0}</strong> {data?.total === 1 ? 'exercise' : 'exercises'} <span>of {data?.catalogTotal ?? 100}</span></>}</p><span>{pending || error || !data?.total ? '' : `Showing ${(data.page - 1) * 24 + 1}–${Math.min(data.page * 24, data.total)}`}</span></div>
    {error ? <div className="exercise-library-state" role="alert"><h2>Let’s try that again.</h2><p>{error}</p><button onClick={() => setRetry(retry + 1)}>Retry</button></div> : pending ? <div className="exercise-library-grid exercise-catalog-grid" aria-label="Loading exercises" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <div key={index} className="exercise-skeleton" aria-hidden="true"><div className="exercise-skeleton-media"><Dumbbell size={32} /></div><div className="exercise-skeleton-body"><i /><i /><i /><b /></div></div>)}</div> : !data?.data.length ? <div className="exercise-library-state"><Dumbbell size={32} /><h2>No moves found</h2><p>{query.trim() ? `Nothing matches “${query.trim()}” with these filters. Try a shorter name or remove a selection.` : 'These selections do not overlap. Remove an active filter to widen your options.'}</p><button onClick={reset}>Show all exercises</button></div> : <>
      <div className="exercise-library-grid exercise-catalog-grid">{data.data.map(exercise => <article className="exercise-card" key={exercise.id}>
        <button className="exercise-media-button" data-exercise-id={exercise.id} onClick={event => open(exercise, event.currentTarget)} aria-label={`View ${exercise.name}`}><ExerciseMedia exercise={exercise} /></button>
        <div className="exercise-card-body"><p className="eyebrow">{exercise.group} · {exercise.difficulty}</p><h3>{exercise.name}</h3><div className="exercise-tags"><span title="Target muscle">{exercise.target_muscle}</span><span title="Equipment">{exercise.equipment}</span></div><button className="exercise-view-details" data-exercise-id={exercise.id} onClick={event => open(exercise, event.currentTarget)} aria-label={`View details for ${exercise.name}`}>View details <ArrowRight size={15} /></button></div>
      </article>)}</div>
      <nav className="exercise-pagination" aria-label="Exercise pages"><button disabled={page <= 1} onClick={() => changePage(page - 1)}><ArrowLeft size={15} /> Previous</button><span>Page {data.page} of {data.totalPages}</span><button disabled={page >= data.totalPages} onClick={() => changePage(page + 1)}>Next <ArrowRight size={15} /></button></nav>
    </>}
    <p className="exercise-source-credit">100 exercises curated for FitSync · Demonstrations from <a href="https://github.com/JahelCuadrado/ExerciseGymGifsDB" target="_blank" rel="noreferrer">JahelCuadrado / ExerciseGymGifsDB</a></p>
    {selected && <ExerciseDetails key={selected.id} exercise={selected} onClose={close} />}
  </div>
}
