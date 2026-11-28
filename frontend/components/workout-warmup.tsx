'use client'

import { useState } from 'react'
import { stretchingExercises, stretchingSource, warmupExercises, warmupSource } from '../../shared/workout-warmup'
import type { SessionPreparation } from '../../shared/daily-plans'
import { durationLabel } from '@/lib/exercise-guidance'
import '@/app/workout-warmup.css'

type PreparationChoice = 'stretching' | 'warmup' | 'both'
const choices: { value: PreparationChoice; label: string }[] = [{ value: 'stretching', label: 'Stretching only' }, { value: 'warmup', label: 'Warm-up only' }, { value: 'both', label: 'Both' }]

export function WorkoutWarmup({ startTime, machines = false, preparation, adjustments = [], busy = false, onChange, onView }: { startTime?: string; machines?: boolean; preparation?: SessionPreparation; adjustments?: string[]; busy?: boolean; onChange?: (preparation: SessionPreparation) => void; onView: (id: string) => void }) {
  const [selected, setSelected] = useState('')
  const [libraryChoice, setLibraryChoice] = useState<PreparationChoice>('both')
  const option = warmupExercises.find(exercise => exercise.id === selected)
  const plan = !!startTime
  const prep = preparation ?? { warmupSeconds: 0, cooldownSeconds: 0, transitionSeconds: 0, stretchingSeconds: 120 }
  const choice = plan ? prep.warmupSeconds > 0 ? (prep.stretchingSeconds ?? 0) > 0 ? 'both' : 'warmup' : 'stretching' : libraryChoice
  const stretching = choice !== 'warmup', warmup = choice !== 'stretching'
  const options = stretchingExercises.filter(exercise => !plan || (!adjustments.includes('Avoid kneeling') || exercise.id !== 'kneeling-lat-stretch') && (!adjustments.includes('Avoid overhead movements') || !['overhead-triceps-stretch', 'kneeling-lat-stretch'].includes(exercise.id)))
  const stretch = options.find(exercise => exercise.id === prep.stretchExerciseId) ?? options.find(exercise => exercise.id === 'rear-deltoid-stretch') ?? options[0]
  const seconds = (stretching ? prep.stretchingSeconds || 120 : 0) + (warmup ? prep.warmupSeconds || 300 : 0)
  const start = startTime ? Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)) : null
  const before = start === null ? null : start - Math.ceil(seconds / 60)
  const clock = before === null ? null : `${String(Math.floor(((before % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((before % 60) + 60) % 60).padStart(2, '0')}`
  const choose = (value: PreparationChoice) => plan ? onChange?.({ ...prep, warmupSeconds: value === 'stretching' ? 0 : 300, stretchingSeconds: value === 'warmup' ? 0 : 120, stretchingStatus: undefined }) : setLibraryChoice(value)
  return <section className="workout-warmup" aria-label="Workout preparation">
    <header><h3>{plan ? 'Prepare your way' : 'Stretching & warm-up'}</h3><p>{startTime ? `${clock}${before! < 0 ? ' (previous day)' : ''} to ${startTime} · ${durationLabel(seconds)} before your workout` : 'Choose stretching, a warm-up, or a combination of both.'}</p></header>
    <div className="workout-preparation-choices" role="group" aria-label="Preparation choice">{choices.map(item => <button type="button" key={item.value} aria-pressed={choice === item.value} disabled={busy} onClick={() => choose(item.value)}>{item.label}</button>)}</div>
    {warmup && <section className="workout-preparation-section" aria-label="Warm-up">
      <h4>{choice === 'both' ? '1. Warm up' : 'Warm up'}{plan && <small>5 min</small>}</h4>
      <p>Start easily and increase your pace gradually. Before lifting, rehearse your first movement with a light load.</p>
      {(!plan || machines) && <label className="workout-warmup-choice">Choose one warm-up<select value={selected} onChange={event => setSelected(event.target.value)}><option value="">Easy walk / march in place</option>{warmupExercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>}
      <div className="workout-warmup-options"><strong>{option?.name || 'Easy walk / march in place'}</strong><p>{option?.cue || 'Walk or march gently at a comfortable pace. No equipment needed.'}</p>{option && <button type="button" onClick={() => onView(option.id)}>View movement</button>}</div>
      <a href={warmupSource.url} target="_blank" rel="noreferrer">Warm-up guidance</a>
    </section>}
    {stretching && <section className="workout-preparation-section" aria-label="Stretching">
      <h4>{choice === 'both' ? '2. Stretch with warm muscles' : 'Stretch with warm muscles'}{plan && <small>2 min allowance</small>}</h4>
      <p>The five catalog stretches use static holds. Use a comfortable range without bouncing; stop for pain. Save longer holds for after training. The allowance includes preparation, not a two-minute hold.</p>
      {plan ? <>
        <label className="workout-warmup-choice">Suitable stretch<select disabled={busy} value={stretch.id} onChange={event => onChange?.({ ...prep, stretchExerciseId: event.target.value })}>{options.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>
        <div className="workout-warmup-options"><button type="button" onClick={() => onView(stretch.id)}>View stretch</button></div>
      </> : <div className="workout-stretch-list">{stretchingExercises.map(exercise => <button type="button" key={exercise.id} onClick={() => onView(exercise.id)}>{exercise.name}</button>)}</div>}
      <a href={stretchingSource.url} target="_blank" rel="noreferrer">Stretching guidance</a>
    </section>}
    {plan && <small className="workout-preparation-note">Your choice updates preparation time before the workout. Exercise start times stay unchanged. Preparation is counted once; choosing more time may extend your original session preference.</small>}
  </section>
}
