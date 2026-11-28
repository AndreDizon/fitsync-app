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
  const warmupSeconds = warmup ? prep.warmupSeconds || 300 : 0
  const stretchingSeconds = stretching ? prep.stretchingSeconds || 120 : 0
  const options = stretchingExercises.filter(exercise => !plan || (!adjustments.includes('Avoid kneeling') || exercise.id !== 'kneeling-lat-stretch') && (!adjustments.includes('Avoid overhead movements') || !['overhead-triceps-stretch', 'kneeling-lat-stretch'].includes(exercise.id)))
  const stretch = options.find(exercise => exercise.id === prep.stretchExerciseId) ?? options.find(exercise => exercise.id === 'rear-deltoid-stretch') ?? options[0]
  const seconds = stretchingSeconds + warmupSeconds
  const start = startTime ? Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)) : null
  const before = start === null ? null : start - Math.ceil(seconds / 60)
  const clock = before === null ? null : `${String(Math.floor(((before % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((before % 60) + 60) % 60).padStart(2, '0')}`
  const displayTime = (time: string) => { const [hour, minute] = time.split(':').map(Number); return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}` }
  const choose = (value: PreparationChoice) => plan ? onChange?.({ ...prep, warmupSeconds: value === 'stretching' ? 0 : 300, stretchingSeconds: value === 'warmup' ? 0 : 120, stretchingStatus: undefined }) : setLibraryChoice(value)
  return <section className="workout-warmup" aria-label="Workout preparation">
    <header><h3>{plan ? 'Before your workout' : 'Warm-up & stretching'}</h3><p>Choose what fits you. Warm-up gets you moving; our stretch options use gentle holds.</p></header>
    <div className="workout-preparation-choices" role="group" aria-label="Preparation choice">{choices.map(item => <button type="button" key={item.value} aria-pressed={choice === item.value} disabled={busy} onClick={() => choose(item.value)}>{item.label}</button>)}</div>
    {plan && <dl className="workout-preparation-times" aria-live="polite"><div><dt>Prepare at</dt><dd>{displayTime(clock!)}{before! < 0 && <small>Previous day</small>}</dd></div><div><dt>Workout starts</dt><dd>{displayTime(startTime!)}</dd></div><div><dt>Preparation time</dt><dd>{durationLabel(seconds)}</dd></div></dl>}
    <div className={'workout-preparation-content' + (choice === 'both' ? ' is-combined' : '')}>
    {warmup && <section className="workout-preparation-section" aria-label="Warm-up">
      <h4>{choice === 'both' ? 'First: easy movement' : 'Easy movement'}<small>{plan ? `${durationLabel(warmupSeconds)} planned` : 'Usually 5–10 min'}</small></h4>
      {(!plan || machines) && <label className="workout-warmup-choice">Choose a movement<select disabled={busy} value={selected} onChange={event => setSelected(event.target.value)}><option value="">Easy walk / march in place</option>{warmupExercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>}
      <div className="workout-warmup-options"><strong>{option?.name || 'Easy walk / march in place'}</strong><p>{option?.cue || 'Walk or march at an easy pace, then gradually move a little faster.'}</p><p>Before lifting, practise your first exercise with a light load.</p>{option && <button type="button" onClick={() => onView(option.id)}>View movement</button>}</div>
    </section>}
    {stretching && <section className="workout-preparation-section" aria-label="Stretching">
      <h4>{choice === 'both' ? 'Then: a gentle stretch' : 'A gentle stretch'}{plan && <small>{durationLabel(stretchingSeconds)} planned</small>}</h4>
      {choice === 'stretching' && <p className="workout-stretch-reminder"><strong>Already warmed up?</strong> Stretch with warm muscles. If you are starting cold, do some easy movement first.</p>}
      {plan ? <>
        <label className="workout-warmup-choice">Choose a stretch<select disabled={busy} value={stretch.id} onChange={event => onChange?.({ ...prep, stretchExerciseId: event.target.value })}>{options.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>
        <p className="workout-stretch-instruction"><strong>Hold gently for about 30 seconds.</strong> Repeat on the other side where applicable. Breathe normally; do not bounce or push into pain.</p>
        <small>Planned time includes getting into position and changing sides. It is not one long hold.</small>
        <div className="workout-warmup-options"><button type="button" onClick={() => onView(stretch.id)}>View stretch</button></div>
      </> : <div className="workout-stretch-list">{stretchingExercises.map(exercise => <button type="button" key={exercise.id} onClick={() => onView(exercise.id)}>{exercise.name}</button>)}</div>}
    </section>}
    </div>
    <footer className="workout-preparation-footer"><p><strong>Moving or holding?</strong> Moving stretches (dynamic) gently practise a movement. Our five stretches use holds (static) for flexibility. Do these with warm muscles; after training is a good time.</p>{plan && <small>Changing your choice moves preparation earlier or later. Your workout start stays the same; extra preparation adds to your total time.</small>}<div className="workout-preparation-sources"><span>Read the guidance:</span><a href={warmupSource.url} target="_blank" rel="noreferrer">American Heart Association</a><a href={stretchingSource.url} target="_blank" rel="noreferrer">Mayo Clinic</a></div></footer>
  </section>
}
