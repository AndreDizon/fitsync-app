'use client'

import { useState } from 'react'
import { defaultStretchId, stretchingExercises, stretchingSource, stretchingTime, warmupExercises, warmupSource } from '../../shared/workout-warmup'
import type { SessionPreparation } from '../../shared/daily-plans'
import { durationLabel } from '@/lib/exercise-guidance'
import '@/app/workout-warmup.css'

type PreparationChoice = 'stretching' | 'warmup' | 'both'
const choices: { value: PreparationChoice; label: string }[] = [{ value: 'stretching', label: 'Stretching only' }, { value: 'warmup', label: 'Warm-up only' }, { value: 'both', label: 'Both' }]

export function WorkoutWarmup({ startTime, machines = false, preparation, adjustments = [], busy = false, onChange, onView }: { startTime?: string; machines?: boolean; preparation?: SessionPreparation; adjustments?: string[]; busy?: boolean; onChange?: (preparation: SessionPreparation) => void; onView: (id: string) => void }) {
  const [selected, setSelected] = useState('')
  const [libraryPreparation, setLibraryPreparation] = useState<SessionPreparation>({ warmupSeconds: 300, cooldownSeconds: 0, transitionSeconds: 0, stretchingSeconds: stretchingTime([defaultStretchId]).totalSeconds, stretchExerciseIds: [defaultStretchId], stretchRepetitions: 2, stretchSetupSeconds: 30 })
  const option = warmupExercises.find(exercise => exercise.id === selected)
  const plan = !!startTime
  const prep = plan ? preparation ?? { warmupSeconds: 300, cooldownSeconds: 0, transitionSeconds: 0 } : libraryPreparation
  const choice = prep.warmupSeconds > 0 ? (prep.stretchingSeconds ?? 0) > 0 ? 'both' : 'warmup' : 'stretching'
  const stretching = choice !== 'warmup', warmup = choice !== 'stretching'
  const warmupSeconds = warmup ? prep.warmupSeconds || 300 : 0
  const options = stretchingExercises.filter(exercise => !plan || (!adjustments.includes('Avoid kneeling') || exercise.id !== 'kneeling-lat-stretch') && (!adjustments.includes('Avoid overhead movements') || !['overhead-triceps-stretch', 'kneeling-lat-stretch'].includes(exercise.id)))
  const savedIds = prep.stretchExerciseIds ?? [prep.stretchExerciseId ?? defaultStretchId]
  const matchingIds = savedIds.filter(id => options.some(exercise => exercise.id === id))
  const ids = matchingIds.length ? matchingIds : [defaultStretchId]
  const repetitions = prep.stretchRepetitions ?? 2
  const estimate = stretchingTime(ids, repetitions, prep.stretchSetupSeconds ?? (prep.stretchExerciseIds ? 30 : 0))
  const stretchingSeconds = stretching ? prep.stretchingSeconds || estimate.totalSeconds : 0
  const seconds = stretchingSeconds + warmupSeconds
  const start = startTime ? Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)) : null
  const before = start === null ? null : start - Math.ceil(seconds / 60)
  const clock = before === null ? null : `${String(Math.floor(((before % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((before % 60) + 60) % 60).padStart(2, '0')}`
  const displayTime = (time: string) => { const [hour, minute] = time.split(':').map(Number); return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}` }
  const update = (value: PreparationChoice, selectedIds = ids, repeats = repetitions, warmSeconds = Math.min(600, Math.max(300, prep.warmupSeconds || 300))) => {
    const next = { ...prep, warmupSeconds: value === 'stretching' ? 0 : warmSeconds, stretchingSeconds: value === 'warmup' ? 0 : stretchingTime(selectedIds, repeats).totalSeconds, stretchExerciseIds: selectedIds, stretchRepetitions: repeats, stretchSetupSeconds: 30, stretchingStatus: undefined }
    if (plan) onChange?.(next); else setLibraryPreparation(next)
  }
  return <section className="workout-warmup" aria-label="Workout preparation">
    <header><h3>{plan ? 'Before your workout' : 'Warm-up & stretching'}</h3><p>Choose what fits you. Warm-up gets you moving; our stretch options use gentle holds.</p></header>
    <div className="workout-preparation-choices" role="group" aria-label="Preparation choice">{choices.map(item => <button type="button" key={item.value} aria-pressed={choice === item.value} disabled={busy} onClick={() => update(item.value)}>{item.label}</button>)}</div>
    {plan && <dl className="workout-preparation-times" aria-live="polite"><div><dt>Prepare at</dt><dd>{displayTime(clock!)}{before! < 0 && <small>Previous day</small>}</dd></div><div><dt>Workout starts</dt><dd>{displayTime(startTime!)}</dd></div><div><dt>Preparation time</dt><dd>{durationLabel(seconds)}</dd></div></dl>}
    <div className={'workout-preparation-content' + (choice === 'both' ? ' is-combined' : '')}>
    {warmup && <section className="workout-preparation-section" aria-label="Warm-up">
      <h4>{choice === 'both' ? 'First: easy movement' : 'Easy movement'}<small>{plan ? `${durationLabel(warmupSeconds)} planned` : 'Usually 5–10 min'}</small></h4>
      <label className="workout-warmup-choice">Warm-up duration<select disabled={busy} value={warmupSeconds} onChange={event => update(choice, ids, repetitions, Number(event.target.value))}>{warmupSeconds < 300 && <option value={warmupSeconds}>Saved: {durationLabel(warmupSeconds)}</option>}{[5, 6, 7, 8, 9, 10].map(minutes => <option key={minutes} value={minutes * 60}>{minutes} minutes</option>)}</select></label>
      {(!plan || machines) && <label className="workout-warmup-choice">Choose a movement<select disabled={busy} value={selected} onChange={event => setSelected(event.target.value)}><option value="">Easy walk / march in place</option>{warmupExercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>}
      <div className="workout-warmup-options"><strong>{option?.name || 'Easy walk / march in place'}</strong><p>{option?.cue || 'Walk or march at an easy pace, then gradually move a little faster.'}</p><p>Before lifting, practise your first exercise with a light load.</p>{option && <button type="button" onClick={() => onView(option.id)}>View movement</button>}</div>
    </section>}
    {stretching && <section className="workout-preparation-section" aria-label="Stretching">
      <h4>{choice === 'both' ? 'Then: selected stretches' : 'Held stretches'}{plan && <small>{durationLabel(stretchingSeconds)} planned</small>}</h4>
      {choice === 'stretching' && <p className="workout-stretch-reminder"><strong>Already warmed up?</strong> Stretch with warm muscles. If you are starting cold, do some easy movement first.</p>}
      <p>Choose stretches for the muscles you use. There is no fixed number of different stretches to complete.</p>
      <label className="workout-warmup-choice">Repeats per stretch / side<select disabled={busy} value={repetitions} onChange={event => update(choice, ids, Number(event.target.value))}>{[2, 3, 4].map(count => <option key={count} value={count}>{count} repeats</option>)}</select></label>
      <div className="workout-stretch-selection">{options.map(exercise => <div key={exercise.id}><label><input type="checkbox" checked={ids.includes(exercise.id)} disabled={busy || ids.length === 1 && ids.includes(exercise.id)} onChange={event => update(choice, event.target.checked ? [...ids, exercise.id] : ids.filter(id => id !== exercise.id))} />{exercise.name}<small>{exercise.sides === 2 ? 'Both sides, one at a time' : 'Both sides together'}</small></label><button type="button" aria-label={'View ' + exercise.name} onClick={() => onView(exercise.id)}>View</button></div>)}</div>
      <p className="workout-stretch-instruction"><strong>30 seconds per hold × {repetitions} repeats × applicable sides.</strong> Breathe normally; do not bounce or push into pain.</p>
      <small>{durationLabel(estimate.holdSeconds)} holding + {durationLabel(estimate.preparationSeconds)} setup = {durationLabel(estimate.totalSeconds)}. Setup adds 30 seconds per selected stretch; this is a FitSync estimate.</small>
      {stretchingSeconds !== estimate.totalSeconds && <div className="workout-warmup-options"><small>Saved timing differs from this guide.</small><button type="button" disabled={busy} onClick={() => update(choice)}>Update stretch timing</button></div>}
      {!plan && <small>The current five stretches cover selected muscles, not a complete whole-body flexibility routine.</small>}
    </section>}
    </div>
    <footer className="workout-preparation-footer"><p><strong>Moving or holding?</strong> Moving stretches (dynamic) gently practise a movement. Our five stretches use holds (static) for flexibility. Do these with warm muscles; after training is a good time.</p>{plan && <small>Changing your choice moves preparation earlier or later. Your workout start stays the same; extra preparation adds to your total time.</small>}<div className="workout-preparation-sources"><span>Read the guidance:</span><a href={warmupSource.url} target="_blank" rel="noreferrer">American Heart Association</a><a href={stretchingSource.url} target="_blank" rel="noreferrer">Mayo Clinic</a></div></footer>
  </section>
}
