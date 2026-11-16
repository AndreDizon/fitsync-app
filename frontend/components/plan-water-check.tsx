'use client'

import { Check, ChevronDown, GlassWater, Plus } from 'lucide-react'
import { PlanTimeInput } from './plan-time-input'
import '@/app/plan-water-check.css'

type WaterGlass = { time: string; done: boolean }

export function PlanWaterCheck({ water, dayName, onToggle, onTimeChange, onSetAll }: {
  water: WaterGlass[]
  dayName: string
  onToggle: (index: number, done: boolean) => void
  onTimeChange: (index: number, time: string) => void
  onSetAll: (done: boolean) => void
}) {
  const done = water.filter(glass => glass.done).length
  const next = water.findIndex(glass => !glass.done)
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
  }
  return <div className="water-check-card">
    <svg className="wc-water-art" viewBox="0 0 900 360" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-60 249C113 202 266 302 454 258S733 229 960 270V390H-60Z" fill="#acdfff" opacity=".1"/>
      <path d="M-60 288C150 241 279 331 485 293S747 266 960 306V390H-60Z" fill="#c8ebff" opacity=".08"/>
      <g fill="none" stroke="#d8efff" strokeWidth="1.1">
        <path d="M-60 25C111-36 246 103 436 52S751-12 960 48" opacity=".13"/>
        <path d="M-60 39C111-22 246 117 436 66S751 2 960 62" opacity=".1"/>
        <path d="M-60 232C113 185 266 285 454 241S733 212 960 253" opacity=".26"/>
        <path d="M-60 244C113 197 266 297 454 253S733 224 960 265" opacity=".2"/>
        <path d="M-60 256C113 209 266 309 454 265S733 236 960 277" opacity=".14"/>
        <path d="M-60 298C150 251 279 341 485 303S747 276 960 316" opacity=".17"/>
      </g>
    </svg>
    <header className="wc-header"><div><h3 id="my-plan-water-title" tabIndex={-1}>Water check</h3><p>{dayName}&apos;s water log</p></div><button type="button" className="wc-log" disabled={next < 0} onClick={() => { if (next >= 0) onToggle(next, true) }}>{next < 0 ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{next < 0 ? 'Goal logged' : 'Log a glass'}</button></header>
    <div className="wc-body"><div className="wc-progress" aria-live="polite"><div><strong>{done}<span> / {water.length} glasses</span></strong><span>{(done * 250).toLocaleString('en-US')} of {(water.length * 250).toLocaleString('en-US')} ml logged</span></div><progress aria-label="Water goal completed" value={done} max={water.length} /></div>
    <div className="wc-glasses" role="group" aria-label="Water glasses">{water.map((glass, index) => <button type="button" key={index} className="wc-glass" aria-pressed={glass.done} aria-label={`Glass ${index + 1}, ${formatTime(glass.time)}, ${glass.done ? 'logged; undo' : 'not logged; log 250 ml'}`} title={`Glass ${index + 1} · ${formatTime(glass.time)} · ${glass.done ? 'Logged' : '250 ml'}`} onClick={() => onToggle(index, !glass.done)}><span className="wc-glass-art"><GlassWater size={26} strokeWidth={1.6} aria-hidden="true" />{glass.done && <Check size={11} className="wc-glass-check" aria-hidden="true" />}</span><strong><span className="wc-glass-prefix">Glass </span>{index + 1}</strong></button>)}</div></div>
    <footer className="wc-footer"><p>Tap to log or undo. <span>250 ml each.</span></p><details className="wc-times"><summary>Times &amp; details<ChevronDown size={15} aria-hidden="true" /></summary><div className="wc-detail-content"><div className="wc-tools"><p>Choose when you plan to drink each glass.</p><button type="button" onClick={() => onSetAll(done !== water.length)}>{done === water.length ? 'Undo all' : 'Mark all done'}</button></div><div className="wc-time-grid">{water.map((glass, index) => <label key={index}>Glass {index + 1}<PlanTimeInput label={'Water time ' + (index + 1)} value={glass.time} onChange={time => onTimeChange(index, time)} /></label>)}</div><p className="wc-note">App goal: eight 250 ml glasses. Adjust to your needs and any clinician advice.</p></div></details></footer>
  </div>
}
