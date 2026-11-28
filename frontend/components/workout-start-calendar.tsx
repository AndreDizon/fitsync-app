'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { validWorkoutDate, workoutDateAllowed } from '../../shared/workout-program'
import '@/app/onboarding/workout-program.css'

export function formatWorkoutDate(date: string) {
  return validWorkoutDate(date) ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z')) : 'Choose a date'
}

export function WorkoutStartCalendar({ value, trainingDays, timeZone, onChange }: { value: string; trainingDays: string[]; timeZone: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!open) return
    dialog.current?.showModal()
    return () => dialog.current?.close()
  }, [open])
  const show = () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    setMonth((value || today).slice(0, 7)); setOpen(true)
  }
  const monthDate = new Date((month || '2026-01') + '-01T12:00:00Z')
  const offset = (monthDate.getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate()
  const move = (amount: number) => { monthDate.setUTCMonth(monthDate.getUTCMonth() + amount); setMonth(monthDate.toISOString().slice(0, 7)) }
  return <div className="onb-workout-date">
    <span id="workout-start-date-label">Workout program start date</span>
    <p id="workout-start-date-help">Choose your first training date. Rest days cannot be selected.</p>
    <button type="button" className="onb-date-trigger" disabled={!trainingDays.length} aria-labelledby="workout-start-date-label workout-start-date-value" aria-describedby="workout-start-date-help" aria-haspopup="dialog" onClick={show}><CalendarDays size={19} aria-hidden="true" /><span id="workout-start-date-value">{formatWorkoutDate(value)}</span></button>
    {open && <dialog className="onb-workout-calendar" ref={dialog} aria-labelledby="workout-calendar-title" onCancel={event => { event.preventDefault(); setOpen(false) }} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setOpen(false) } }}>
      <header><div><h2 id="workout-calendar-title">Choose your start date</h2><p>Training days: {trainingDays.join(', ')}. Times follow {timeZone}.</p></div><button type="button" aria-label="Close start-date calendar" onClick={() => setOpen(false)}><X size={20} /></button></header>
      <div className="onb-calendar-month"><button type="button" aria-label="Previous month" disabled={month <= '1900-01'} onClick={() => move(-1)}><ChevronLeft size={20} /></button><h3 aria-live="polite">{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate)}</h3><button type="button" aria-label="Next month" disabled={month >= '2200-12'} onClick={() => move(1)}><ChevronRight size={20} /></button></div>
      <div className="onb-calendar-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day} className="onb-calendar-weekday">{day}</span>)}
        {Array.from({ length: offset }, (_, index) => <span key={'empty-' + index} />)}
        {Array.from({ length: count }, (_, index) => { const date = month + '-' + String(index + 1).padStart(2, '0'); const allowed = workoutDateAllowed(date, trainingDays); return <button key={date} type="button" disabled={!allowed} aria-label={formatWorkoutDate(date) + (allowed ? '' : ' — rest day')} aria-pressed={date === value} title={allowed ? 'Select training start date' : 'Rest day'} onClick={() => { onChange(date); setOpen(false) }}>{index + 1}</button> })}
      </div>
      <p className="onb-calendar-note">Grey dates are your weekly rest days. Change your training days to make a date available.</p>
    </dialog>}
  </div>
}
