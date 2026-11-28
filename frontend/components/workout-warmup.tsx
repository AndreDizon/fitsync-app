'use client'

import { useState } from 'react'
import { warmupExercises, warmupSource } from '../../shared/workout-warmup'
import { durationLabel } from '@/lib/exercise-guidance'
import '@/app/workout-warmup.css'

export function WorkoutWarmup({ seconds = 300, startTime, machines = false, onView }: { seconds?: number; startTime?: string; machines?: boolean; onView: (id: string) => void }) {
  const [selected, setSelected] = useState('')
  const option = warmupExercises.find(exercise => exercise.id === selected)
  const start = startTime ? Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)) : null
  const before = start === null ? null : start - Math.ceil(seconds / 60)
  const clock = before === null ? null : `${String(Math.floor(((before % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((before % 60) + 60) % 60).padStart(2, '0')}`
  return <section className="workout-warmup" aria-label="Warm-up before training">
    <header><h3>Warm up before training</h3><p>{startTime ? `${clock}${before! < 0 ? ' (previous day)' : ''} to ${startTime} · ${durationLabel(seconds)} before your workout starts` : 'Begin with 5–10 minutes of easy movement before your first exercise.'}</p></header>
    <p>Keep the effort easy and increase it gradually. Before lifting, rehearse your first movement with a light load.</p>
    {(!startTime || machines) && <label className="workout-warmup-choice">Choose one warm-up<select value={selected} onChange={event => setSelected(event.target.value)}><option value="">Easy walk / march in place</option>{warmupExercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>}
    <div className="workout-warmup-options"><div><strong>{option?.name || 'Easy walk / march in place'}</strong><p>{option?.cue || 'Walk or march gently at a comfortable pace. No equipment needed.'}</p>{option && <button type="button" onClick={() => onView(option.id)}>View movement</button>}</div></div>
    <small>{startTime ? 'Warm-up is separate from exercise block totals. Generated plans reserve it within your overall session budget; playlist or manually added plans may need this extra preparation time. ' : 'These are existing library exercises used at an easier pace, not extra working sets. Choose one suitable option; you do not need all three. '}<a href={warmupSource.url} target="_blank" rel="noreferrer">Warm-up guidance</a></small>
  </section>
}
