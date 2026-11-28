'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Dumbbell, Search, SlidersHorizontal, X, Check, ChevronDown } from 'lucide-react'
import '@/app/exercise-library.css'
import '@/app/library-workspace.css'
import { OfflineLibraryStatus } from '@/components/offline-library-status'
import { LearningArticles } from './learning-articles'
import { HealthReference } from './health-reference'
import { durationLabel, exerciseGuidance, guidanceLevels, type GuidanceLevel } from '@/lib/exercise-guidance'
import { exerciseTechnique, techniqueSources } from '@/lib/exercise-technique'
import { exerciseScenario } from '@/lib/exercise-scenario'
import { exercisePracticeNotes, preparationSource } from '@/lib/exercise-practice-notes'
import { usePlanningProfile } from '@/lib/planning-profile'
import { loadExerciseCatalog, type SeedExercise } from '@/lib/exercise-offline'

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
const estimateRange = (values: [number, number]) => [...new Set(values.map(value => value.toLocaleString('en-US', { maximumFractionDigits: 1 })))].join('–')
const restRange = (values: [number, number]) => [...new Set(values.map(durationLabel))].join('–')

function ExerciseMedia({ exercise, animated = false }: { exercise: Exercise; animated?: boolean }) {
  const [failed, setFailed] = useState(false)
  const src = animated ? exercise.media_urls[0] : exercise.image_url
  return <div className={`exercise-library-media ${animated ? 'is-demonstration' : ''}`}>
    {src && !failed ? <img src={src} alt={`${exercise.name} demonstration`} loading={animated ? 'eager' : 'lazy'} onError={() => setFailed(true)} /> : <div className="exercise-media-unavailable"><Dumbbell size={32} /><span>Demonstration unavailable</span></div>}
  </div>
}

export function ExerciseDetails({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [animate, setAnimate] = useState(false)
  const [tab, setTab] = useState('training')
  const [level, setLevel] = useState<GuidanceLevel>('Beginner')
  const profile = usePlanningProfile()
  const profileWeight = Number(profile?.weightKg)
  const validProfileWeight = Number.isFinite(profileWeight) && profileWeight >= 20 && profileWeight <= 350
  const [weight, setWeight] = useState(() => validProfileWeight ? String(profileWeight) : '')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg')
  const [weightEdited, setWeightEdited] = useState(false)
  useEffect(() => { if (!weightEdited && validProfileWeight) setWeight(String(weightUnit === 'kg' ? profileWeight : Math.round(profileWeight * 2.2046226218 * 100) / 100)) }, [profileWeight, validProfileWeight, weightEdited, weightUnit])
  const weightKg = weight.trim() && Number.isFinite(Number(weight)) ? Math.round(Number(weight) / (weightUnit === 'lb' ? 2.2046226218 : 1) * 100) / 100 : null
  const scenario = exerciseScenario(exercise, level, weightKg)
  const changeWeightUnit = (unit: 'kg' | 'lb') => { if (unit === weightUnit) return; if (weightKg !== null) setWeight(String(Math.round(weightKg * (unit === 'kg' ? 1 : 2.2046226218) * 100) / 100)); setWeightUnit(unit) }
  const guidance = exerciseGuidance(exercise)
  const practiceNotes = exercisePracticeNotes(exercise)
  const technique = exerciseTechnique(exercise.id)
  const techniqueSource = technique ? techniqueSources[technique.source] : null
  const referenceSources = [preparationSource, techniqueSource, { label: 'ACSM resistance training guidance', url: 'https://acsm.org/resistance-training-guidelines-update-2026/' }, { label: 'Systematic review: rest intervals and strength', url: 'https://pubmed.ncbi.nlm.nih.gov/28933024/' }, { label: guidance.source, url: guidance.url }].filter((source, index, all) => source && all.findIndex(other => other?.url === source.url) === index)
  useEffect(() => { dialog.current?.showModal() }, [])
  useEffect(() => { if (dialog.current) dialog.current.scrollTop = 0 }, [tab])
  const close = () => { dialog.current?.close(); onClose() }
  const tabs = [{ id: 'training', label: 'Training & rest' }, { id: 'calculations', label: 'Calculations' }, { id: 'reference', label: 'Exercise reference' }]
  return <dialog ref={dialog} className="exercise-detail-dialog" aria-labelledby="exercise-detail-title" onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close() } }}>
    <div className="exercise-detail-header"><div><h2 id="exercise-detail-title">{exercise.name}</h2><p className="exercise-guide-subtitle">Learn the movement, plan your effort and progress with control.</p></div><button className="exercise-close" onClick={close} aria-label="Close exercise details" autoFocus><X size={20} /></button>
    <div className="exercise-guide-tabs" role="tablist" aria-label="Exercise information">{tabs.map((entry, index) => <button key={entry.id} id={'exercise-tab-'+entry.id} role="tab" aria-selected={tab === entry.id} aria-controls={'exercise-panel-'+entry.id} tabIndex={tab === entry.id ? 0 : -1} onClick={() => { setTab(entry.id); setAnimate(false) }} onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (index+(event.key === 'ArrowRight' ? 1 : -1)+tabs.length)%tabs.length; setTab(tabs[next].id); setAnimate(false); document.getElementById('exercise-tab-'+tabs[next].id)?.focus() } }}>{entry.label}</button>)}</div>
    </div>
    <div className="exercise-detail-body" role="tabpanel" id={'exercise-panel-'+tab} aria-labelledby={'exercise-tab-'+tab} tabIndex={0}>
      {tab === 'training' && <>
        <section className="exercise-guide-section"><h3>Understand the movement</h3><div className="exercise-guide-overview"><div className="exercise-guide-demonstration"><ExerciseMedia key={String(animate)} exercise={exercise} animated={animate} />{exercise.media_urls.length > 0 && <button className="exercise-animation-toggle" aria-pressed={animate} onClick={() => setAnimate(!animate)}>{animate ? 'Pause demonstration' : 'Play demonstration'}</button>}</div><div><h4 className="exercise-guide-purpose">{technique?.label ?? exercise.movementPattern}</h4><p>{technique?.purpose ?? 'Use the exercise-specific steps below to learn the movement.'}</p><dl className="exercise-guide-facts"><div><dt>Primary muscle</dt><dd>{exercise.target_muscle}</dd></div><div><dt>Also works</dt><dd>{exercise.secondary_muscles.join(', ') || 'Not listed'}</dd></div><div><dt>Equipment</dt><dd>{exercise.equipment}</dd></div><div><dt>Movement level</dt><dd>{exercise.difficulty}</dd></div></dl></div></div></section>
        <section className="exercise-guide-section"><h3>Before you start</h3><dl className="exercise-guide-scaling"><div><dt>Warm up</dt><dd>{practiceNotes.warmup}</dd></div><div><dt>Check your setup</dt><dd>{practiceNotes.setup}</dd></div></dl></section>
        <section className="exercise-guide-section exercise-instructions"><h3>Step by step</h3><ol id="exercise-guidance">{exercise.instructions.map((text,index) => <li key={index}>{text}</li>)}</ol></section>
        <section className="exercise-guide-section"><h3>Breathing & counting</h3><dl className="exercise-guide-scaling"><div><dt>Keep breathing</dt><dd>{practiceNotes.breathing}</dd></div><div><dt>Count your work</dt><dd>{technique?.counting ?? practiceNotes.counting}</dd></div></dl></section>
        <section className="exercise-guide-section"><h3>Common mistakes & corrections</h3><ul className="exercise-guide-checks">{(technique?.checks ?? ['Use a comfortable range and avoid uncontrolled momentum.', 'Reduce the challenge if your position changes as you tire.']).map(check => <li key={check}>{check}</li>)}</ul><p className="exercise-guide-safety">Stop for pain, dizziness or unusual symptoms. A demonstration cannot assess whether a load or variation is suitable for you.</p></section>
        <section className="exercise-guide-section"><h3>Adapt the challenge</h3><dl className="exercise-guide-scaling"><div><dt>Make it easier</dt><dd>{technique?.easier}</dd></div><div><dt>When control is steady</dt><dd>{technique?.harder}</dd></div></dl><p>{guidance.effort}</p></section>
        <section className="exercise-guide-section"><h3>How to rest & recover</h3><dl className="exercise-guide-scaling"><div><dt>Between sets</dt><dd>{guidance.rest}. {guidance.restDetail}</dd></div><div><dt>Before the next exercise</dt><dd>Recover your breathing, check the next setup and resume when your technique is controlled. Use the Calculations tab to explore an example recovery allowance.</dd></div><div><dt>Across your week</dt><dd>{practiceNotes.weeklyRecovery}</dd></div></dl></section>
      </>}
      {tab === 'calculations' && <>
        <section className="exercise-guide-section"><h3>Build a practice example</h3><p>Choose an experience level and enter your body weight. The targets, recovery and estimates update together.</p><div className="exercise-guide-levels" role="group" aria-label="Training experience">{guidanceLevels.map(value => <button key={value} aria-pressed={level === value} onClick={() => setLevel(value)}>{value}</button>)}</div>{level === 'Beginner' && exercise.difficulty !== 'Beginner' && <p className="exercise-guide-notice">This movement is {exercise.difficulty.toLowerCase()}. Use an easier variation or seek technique guidance first.</p>}<p className="exercise-guide-footnote">Examples are FitSync planning assumptions, not personal prescriptions. Your profile and saved plans stay unchanged.</p><div className="exercise-weight-controls"><label htmlFor="exercise-estimate-weight">Body weight for estimate<input id="exercise-estimate-weight" type="number" inputMode="decimal" step="any" min={weightUnit === 'kg' ? 20 : 44.09} max={weightUnit === 'kg' ? 350 : 771.62} placeholder="Enter body weight" value={weight} aria-invalid={!!weight && !scenario.kcal} aria-describedby="exercise-weight-note" onChange={event => { setWeightEdited(true); setWeight(event.target.value) }} /></label><div role="group" aria-label="Body weight unit">{(['kg', 'lb'] as const).map(unit => <button key={unit} type="button" aria-pressed={weightUnit === unit} onClick={() => changeWeightUnit(unit)}>{unit}</button>)}</div>{validProfileWeight && <button type="button" className="exercise-use-weight" onClick={() => { setWeightEdited(false); setWeight(String(weightUnit === 'kg' ? profileWeight : Math.round(profileWeight * 2.2046226218 * 100) / 100)) }}>Use profile weight</button>}</div><p id="exercise-weight-note" className="exercise-guide-footnote">{weight && !scenario.kcal ? `Enter a weight between ${weightUnit === 'kg' ? '20 and 350 kg' : '44.1 and 771.6 lb'}.` : 'Adjust this weight to explore the estimate. Your profile and saved plans stay unchanged.'}</p></section>
        <section className="exercise-guide-section" aria-live="polite"><h3>Sets, repetitions & holds</h3><p className="exercise-guide-template"><strong>{scenario.prescription}</strong><span>{level} practice example</span></p><p>{technique?.counting ?? (scenario.perSide ? 'Complete the same prescribed work on each side, following the Training & rest instructions.' : scenario.timed || scenario.continuous ? 'Track controlled movement or holds by time rather than counting repetitions.' : 'One controlled movement and return is one repetition; keep the same range throughout the set.')}</p><p>These FitSync examples adjust practice volume for the selected experience. They are not official standards by level; advanced users do not always need more work.</p></section>
        <section className="exercise-guide-section" aria-live="polite"><h3>Rest & recovery</h3><div className="exercise-guide-rest"><strong>{scenario.rest[1] ? `${restRange(scenario.rest)} between ${scenario.timed && exercise.category === 'cardio' ? 'rounds' : scenario.perSide && !scenario.alternating ? 'sets or sides' : 'sets'}` : scenario.stretching ? 'Release between holds' : 'No scheduled between-set break'}</strong><p>{scenario.restNote}</p></div><h4>Between exercises</h4><p>{scenario.transition[1] ? `Allow about ${restRange(scenario.transition)} to recover and prepare your next setup for this ${level.toLowerCase()} example. Extend this if breathing or control has not recovered.` : 'Relax out of the position and prepare the next comfortable stretch.'} This transition is separate from the exercise duration below.</p></section>
        <section className="exercise-guide-section exercise-estimates"><h3>Time & energy estimates</h3><dl className="exercise-calculation-results" aria-live="polite"><div><dt>{level} exercise duration</dt><dd>{estimateRange(scenario.durationMinutes)} min</dd></div><div><dt>Estimated energy{scenario.kcal ? ` at ${weight} ${weightUnit}` : ''}</dt><dd>{scenario.kcal ? `${estimateRange(scenario.kcal)} kcal` : 'Enter body weight'}</dd></div></dl><p>For {scenario.prescription}. {scenario.breakCount ? `Includes ${scenario.breakCount} recovery breaks. ` : ''}Setup, warm-up, cooldown and the next-exercise transition are excluded.</p><p>Adult activity-class estimates, including resting energy. Expertise changes example volume and rest, not the assumed activity intensity. Actual effort and pace affect results.</p></section>
      </>}
      {tab === 'reference' && <>
        <section className="exercise-guide-section"><h3>Workout classification</h3><dl className="exercise-reference-facts">{[
          ['Training type', exercise.category === 'strength' ? 'Resistance training' : exercise.category === 'cardio' ? 'Aerobic conditioning' : exercise.category === 'stretching' ? 'Flexibility' : 'Power / impact training'],
          ['Movement focus', technique?.label ?? exercise.movementPattern],
          ['Catalog pattern', exercise.movementPattern],
          ['Muscle group', exercise.group],
          ['Primary muscle', exercise.target_muscle],
          ['Supporting muscles', exercise.secondary_muscles.join(', ') || 'Not listed'],
          ['Equipment', exercise.equipment],
          ['Movement level', exercise.difficulty],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="exercise-guide-footnote">Movement level describes the catalog exercise. It is separate from the experience selected in Calculations.</p></section>
        <section className="exercise-guide-section"><h3>Technique & programming sources</h3><p>Related movement references inform FitSync's editorial guidance. Equipment variants may differ from the linked example; a source link does not imply endorsement or individual assessment.</p><ul>{referenceSources.map(source => source && <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></section>
        <section className="exercise-guide-section"><h3>How to interpret the estimates</h3><p>The experience selector changes the practice example, rest and duration. Energy also uses your adjustable body weight. Repetitions assume 2–4 seconds each; timed work uses the selected hold or interval. Both sides count toward active time. Recovery is calculated separately at 1.3 MET, and alternating-side movements rest between sets rather than every side change. Stretch estimates count holds only.</p><p>Activity-class MET ranges stay constant across experience levels. Energy = MET × 3.5 × weight in kg ÷ 200 × minutes, calculated separately for active work and recovery. These are adult educational estimates, not measured results, a calorie target or a forecast of muscle gain.</p><a href="https://pacompendium.com/" target="_blank" rel="noreferrer">Physical Activity Compendium</a></section>
        <section className="exercise-guide-section"><h3>Catalog & demonstration credits</h3><p>Instructions, difficulty and targets are FitSync editorial content. The animation illustrates the motion; use the written setup and a suitable load.</p><p className="exercise-source-credit">Media: <a href="https://github.com/JahelCuadrado/ExerciseGymGifsDB" target="_blank" rel="noreferrer">ExerciseGymGifsDB</a>{exercise.source_media_url && <> / <a href={exercise.source_media_url} target="_blank" rel="noreferrer">Original demonstration</a></>}</p></section>
      </>}
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
  const reset = () => { setQuery(''); setSearch(''); setFilters(emptyFilters); setEquipment([]); setGroup(''); setSort('relevance'); setPage(1) }
  const clearSearch = () => { setQuery(''); setSearch(''); setPage(1) }
  const setFilter = (key: FilterKey, value: string) => { setFilters(previous => ({ ...previous, [key]: value })); setPage(1) }
  const toggleEquipment = (value: string) => { setEquipment(previous => previous.includes(value) ? previous.filter(item => item !== value) : [...previous, value]); setPage(1) }
  const open = (exercise: Exercise, button: HTMLButtonElement) => { trigger.current = button; setSelected(exercise) }
  const close = () => setSelected(null)
  const changePage = (next: number) => { setPage(next); results.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) }
  const advancedCount = Object.values(filters).filter(Boolean).length
  const count = advancedCount + equipment.length + Number(!!group) + Number(!!query.trim())
  const pending = loading || query.trim() !== search
  const equipmentOptions = data?.facets.equipment ?? []
  const allGroupCount = Object.values(data?.facetCounts.group ?? {}).reduce((sum, number) => sum + number, 0)
  return <div className="page library-page exercise-library-page">
    <header className="plan-tab-page-heading exercise-library-heading sync-status-heading"><div><p className="eyebrow">YOUR LIBRARY</p><h2>Browse exercises & workout articles</h2><p>Explore 100 exercises by focus and equipment, plus articles on training, nutrition and recovery.</p></div><OfflineLibraryStatus compact /></header>
    <LearningArticles/>
    <HealthReference title="Use the workout library with confidence" sources={['activity', 'strength']}>
      <p>Explore by body area, equipment and movement pattern. Open an exercise for technique steps, an editable starting target and practical progression guidance.</p>
      <p>A balanced routine needs more than one body area. A focus filter helps you browse; it does not mean that one exercise guarantees a particular body change. Record sets, repetitions and resistance in My Plan to track performance.</p>
      <p>Demonstrations are from the credited media library. FitSync writes the instructions and planning estimates; reference links are educational, not a certification of this catalog.</p>
    </HealthReference>
    <section className="exercise-filter-studio" aria-label="Find exercises">
      <div className="exercise-search-row">
        <div className="exercise-search-field"><Search size={20} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Try bench press, DB row, or abs…" aria-label="Search exercises" autoComplete="off" spellCheck={false} />{query && <button onClick={clearSearch} aria-label="Clear exercise search"><X size={17} /></button>}</div>
        <label className="exercise-sort"><span>Sort</span><select value={sort} aria-label="Sort exercises" onChange={event => { setSort(event.target.value); setPage(1) }}><option value="relevance">Best match</option><option value="name">Name: A–Z</option><option value="name-desc">Name: Z–A</option><option value="beginner">Beginner first</option></select></label>
      </div>
      <div className="exercise-focus-heading"><span>Focus area</span><span>Choose an area to explore</span></div>
      <div className="exercise-focus-filters" role="group" aria-label="Exercise focus"><button aria-pressed={!group} onClick={() => { setGroup(''); setPage(1) }}>All <span>{data ? allGroupCount : 100}</span></button>{Object.entries(data?.source.groups ?? {}).map(([name]) => {
        const available = data?.facetCounts.group[name] ?? 0
        return <button key={name} aria-pressed={group === name} disabled={!available && group !== name} onClick={() => { setGroup(group === name ? '' : name); setPage(1) }}>{name} <span>{available}</span></button>
      })}</div>
      <details className="exercise-equipment-filters"><summary><Dumbbell size={16} aria-hidden="true" />Equipment {equipment.length > 0 && <span className="exercise-filter-badge">{equipment.length}</span>}<ChevronDown size={16} aria-hidden="true" /></summary><p className="library-filter-help">Select the equipment you can use. Results match any selected equipment; focus and other filters also apply.</p><div className="exercise-equipment-heading"><Dumbbell size={16} aria-hidden="true" /><span>Available equipment</span><small>Matches any selected</small></div>
      <div className="exercise-equipment-options" role="group" aria-label="Available equipment"><button aria-pressed={!equipment.length} onClick={() => { setEquipment([]); setPage(1) }}>Any equipment</button>{equipmentOptions.map(value => {
        const active = equipment.includes(value), available = data?.facetCounts.equipment[value] ?? 0
        return <button key={value} aria-pressed={active} disabled={!active && !available} onClick={() => toggleEquipment(value)}>{active && <Check size={13} aria-hidden="true" />}{displayLabel(value)} <span>{available}</span></button>
      })}</div>
      </details><details className="exercise-more-filters"><summary><SlidersHorizontal size={16} aria-hidden="true" />More filters {advancedCount > 0 && <span className="exercise-filter-badge">{advancedCount}</span>}<ChevronDown size={16} className="exercise-filter-chevron" aria-hidden="true" /></summary>
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
        <div className="exercise-card-body"><p className="eyebrow">{exercise.group} · {exercise.difficulty}</p><h3>{exercise.name}</h3><div className="exercise-tags"><span title="Target muscle">{exercise.target_muscle}</span><span title="Equipment">{exercise.equipment}</span></div><p className="exercise-card-rest">{exerciseGuidance(exercise).rest}</p><button className="exercise-view-details" data-exercise-id={exercise.id} onClick={event => open(exercise, event.currentTarget)} aria-label={`View details for ${exercise.name}`}>View details <ArrowRight size={15} /></button></div>
      </article>)}</div>
      <nav className="exercise-pagination" aria-label="Exercise pages"><button disabled={page <= 1} onClick={() => changePage(page - 1)}><ArrowLeft size={15} /> Previous</button><span>Page {data.page} of {data.totalPages}</span><div className="exercise-page-numbers">{Array.from({ length: data.totalPages }, (_, index) => index + 1).map(number => <button key={number} aria-label={`Exercise page ${number}`} aria-current={number === data.page ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button>)}</div><button disabled={page >= data.totalPages} onClick={() => changePage(page + 1)}>Next <ArrowRight size={15} /></button></nav>
    </>}
    <p className="exercise-source-credit">100 exercises curated for FitSync · Demonstrations from <a href="https://github.com/JahelCuadrado/ExerciseGymGifsDB" target="_blank" rel="noreferrer">JahelCuadrado / ExerciseGymGifsDB</a></p>
    {selected && <ExerciseDetails key={selected.id} exercise={selected} onClose={close} />}
  </div>
}
