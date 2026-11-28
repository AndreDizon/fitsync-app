'use client'

import { useState } from 'react'
import { stretchingExercises, stretchingSource, warmupExercises, warmupSource } from '../../shared/workout-warmup'
import type { SessionPreparation } from '../../shared/daily-plans'
import { durationLabel } from '@/lib/exercise-guidance'
import '@/app/workout-warmup.css'

export function WorkoutWarmup({ startTime, machines = false, preparation, adjustments = [], busy = false, onChange, onView }: { startTime?: string; machines?: boolean; preparation?: SessionPreparation; adjustments?: string[]; busy?: boolean; onChange?: (preparation: SessionPreparation) => void; onView: (id: string) => void }) {
  const [selected, setSelected] = useState('')
  const [showWarmup, setShowWarmup] = useState(false)
  const option = warmupExercises.find(exercise => exercise.id === selected)
  const plan = !!startTime
  const prep = preparation ?? { warmupSeconds: 0, cooldownSeconds: 0, transitionSeconds: 0, stretchingSeconds: 120 }
  const options = stretchingExercises.filter(exercise => !plan || (!adjustments.includes('Avoid kneeling') || exercise.id !== 'kneeling-lat-stretch') && (!adjustments.includes('Avoid overhead movements') || !['overhead-triceps-stretch', 'kneeling-lat-stretch'].includes(exercise.id)))
  const stretch = options.find(exercise => exercise.id === prep.stretchExerciseId) ?? options.find(exercise => exercise.id === 'rear-deltoid-stretch') ?? options[0]
  const warmup = plan ? prep.warmupSeconds > 0 : showWarmup
  const seconds = (prep.stretchingSeconds || 120) + (warmup ? prep.warmupSeconds || 300 : 0)
  const start = startTime ? Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)) : null
  const before = start === null ? null : start - Math.ceil(seconds / 60)
  const clock = before === null ? null : `${String(Math.floor(((before % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((before % 60) + 60) % 60).padStart(2, '0')}`
  const update = (change: Partial<SessionPreparation>) => onChange?.({ ...prep, stretchingSeconds: prep.stretchingSeconds || 120, ...change })
  return <section className="workout-warmup" aria-label="Stretching and optional warm-up">
    <header><h3>{plan ? 'Required: stretching preparation' : 'Stretching & optional warm-up'}</h3><p>{startTime ? `${clock}${before! < 0 ? ' (previous day)' : ''} to ${startTime} · ${durationLabel(seconds)} preparation allowance before your workout` : 'Explore the five stretches already in the exercise library.'}</p></header>
    <p>These are static stretches. Warm your muscles with easy movement first. Stretch gently without bouncing; stop for pain. Longer holds are usually better after training. This check does not mean all five stretches are required.</p>
    {plan ? <>
      <label className="workout-warmup-choice">Suitable stretch<select disabled={busy} value={stretch.id} onChange={event => update({ stretchExerciseId: event.target.value, stretchingStatus: undefined })}>{options.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>
      <div className="workout-warmup-options"><strong>{stretch.name}</strong><p>Review the technique and use a comfortable range. The two-minute allowance includes choosing and preparing; it is not a two-minute stretch hold.</p><button type="button" onClick={() => onView(stretch.id)}>View stretch</button></div>
      <label className="workout-preparation-check"><input type="checkbox" disabled={busy} checked={prep.stretchingStatus === 'completed'} onChange={event => update({ stretchExerciseId: stretch.id, stretchingStatus: event.target.checked ? 'completed' : undefined })} />I completed suitable stretching / mobility with warm muscles.</label>
      <button type="button" className="workout-guidance-choice" disabled={busy} aria-pressed={prep.stretchingStatus === 'adapted'} onClick={() => update({ stretchingStatus: prep.stretchingStatus === 'adapted' ? undefined : 'adapted' })}>{prep.stretchingStatus === 'adapted' ? 'Individual guidance recorded' : 'Use individual guidance instead'}</button>
      <small>If stretching is unsuitable, painful or restricted, follow individual professional guidance. Complete this check before marking workout tasks done.</small>
    </> : <div className="workout-stretch-list">{stretchingExercises.map(exercise => <button type="button" key={exercise.id} onClick={() => onView(exercise.id)}>{exercise.name}</button>)}</div>}
    <p><a href={stretchingSource.url} target="_blank" rel="noreferrer">Stretching guidance</a></p>
    <div className="workout-optional-warmup"><label className="workout-preparation-check"><input type="checkbox" disabled={busy} checked={warmup} onChange={event => plan ? update({ warmupSeconds: event.target.checked ? 300 : 0 }) : setShowWarmup(event.target.checked)} />Add optional cardio warm-up{plan ? ' · 5 min before stretching' : ''}</label>
      {warmup && <>
        <p>Keep the pace easy. This dedicated cardio block is optional; begin stretching only once your muscles are warm.</p>
        {(!plan || machines) && <label className="workout-warmup-choice">Choose one warm-up<select value={selected} onChange={event => setSelected(event.target.value)}><option value="">Easy walk / march in place</option>{warmupExercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>}
        <div className="workout-warmup-options"><strong>{option?.name || 'Easy walk / march in place'}</strong><p>{option?.cue || 'Walk or march gently at a comfortable pace. No equipment needed.'}</p>{option && <button type="button" onClick={() => onView(option.id)}>View movement</button>}</div>
        <small>{plan && 'Adds preparation time before your chosen workout start. It is counted once and can extend your total time beyond the original session preference. '}<a href={warmupSource.url} target="_blank" rel="noreferrer">Warm-up guidance</a></small>
      </>}
    </div>
  </section>
}
