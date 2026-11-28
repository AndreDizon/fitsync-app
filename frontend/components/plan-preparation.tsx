'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Dumbbell, Utensils, Flag, ClipboardCheck } from 'lucide-react'
import { Wordmark } from './wordmark'
import { initialPlanRange } from '../../shared/workout-program'
import { prepareInitialPlans, type PreparationProgress } from '@/lib/daily-plans'
import { formatWorkoutDate } from './workout-start-calendar'
import { goalOptions, type OnboardingProfile } from '../../shared/onboarding'

const phases = [
  { title: 'Starting with your goal', description: 'Your direction comes first.', icon: Flag },
  { title: 'Bringing your workout preferences together', description: 'Your time, equipment, and experience.', icon: Dumbbell },
  { title: 'Organizing your meal preferences', description: 'Your eating preferences and food exclusions.', icon: Utensils },
  { title: 'Your first plans are prepared', description: 'One small step toward a routine that fits.', icon: ClipboardCheck },
]
export function PlanPreparation({ profile, owner }: { profile: OnboardingProfile; owner: string }) {
  const router = useRouter()
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<Awaited<ReturnType<typeof prepareInitialPlans>> | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [progress, setProgress] = useState<PreparationProgress>({ completed: 0, total: 0, through: null })
  const range = initialPlanRange(profile)
  useEffect(() => {
    let active = true
    setError(''); setResult(null); setProgress({ completed: 0, total: 0, through: null })
    prepareInitialPlans(owner, profile, value => { if (active) setProgress(value) }).then(value => { if (active) setResult(value) }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Plan preparation could not finish. Please retry.') })
    return () => { active = false }
  }, [owner, profile, attempt])
  const phase = result ? 3 : elapsed < 1300 ? 0 : elapsed < 2700 ? 1 : 2
  const current = phases[phase]
  const goal = goalOptions.find(([key]) => key === profile.goal)?.[1]
  useEffect(() => {
    router.prefetch('/')
    let previous = performance.now(), visibleTime = 0
    const timer = window.setInterval(() => {
      const now = performance.now()
      const visible = document.visibilityState === 'visible' && !document.querySelector('.app-opening')
      if (visible) visibleTime += now - previous
      previous = now
      setElapsed(Math.min(visibleTime, 5400))
      if (visibleTime >= 5400) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
  }, [router])
  return <main className="plan-preparation">
    <div className="prep-brand"><img src="/mascot/optimized/fox-logo-192.webp" alt="" width={36} height={36} /><Wordmark /></div>
    <section className="prep-content" aria-labelledby="prep-title">
      <div className="prep-mascot-stage" aria-hidden="true"><span className="prep-glow" /><span className="prep-orbit prep-workout"><Dumbbell size={25} /></span><span className="prep-orbit prep-food"><Utensils size={25} /></span><img src="/mascot/fox-greeting.png" width={1143} height={1358} alt="" /><span className="prep-fox-shadow" /></div>
      <p className="prep-eyebrow">EXERCISE + MEAL PLAN SETUP</p>
      <h1 id="prep-title">Putting your goals<br />into <em>motion.</em></h1>
      <p className="prep-intro">Preparing workout and meal drafts for your full planning period.</p>
      <div className="prep-preferences"><span>{goal}</span><span>{profile.days.length} training days · {profile.sessionMinutes} min</span><span>{profile.diet}</span></div>
      <div className="prep-progress"><progress max={progress.total || 1} value={result ? progress.total || 1 : progress.completed} aria-label="Plan preparation progress" /><div role="status" aria-live="polite" aria-atomic="true"><strong>{error ? 'Preparation paused' : current.title}</strong><span>{progress.total ? progress.completed + ' of ' + progress.total + ' calendar days processed' : current.description}</span></div></div>
      <ol className="prep-checklist" aria-label="Planning setup steps">{phases.slice(0, 3).map(({ title, icon: Icon }, index) => <li key={title} className={phase > index ? 'complete' : phase === index ? 'current' : ''}><span>{phase > index ? <Check size={14} /> : <Icon size={14} />}</span><span>{['Your goal', 'Exercise preferences', 'Meal preferences'][index]}</span></li>)}</ol>
      <p className="prep-note">{range ? <>Plans cover <strong>{formatWorkoutDate(range.start)} to {formatWorkoutDate(range.end)}</strong> ({range.days} calendar days). {range.basis === 'review' && 'No target-weight date is available, so this is a four-week planning period. '}</> : 'Review your plan start date.'} Meals continue on rest days. Future plans are editable drafts using your current inputs; review them every four weeks and update them as your needs change. Keep this page open until preparation finishes.</p>
      {error && <div role="alert" className="prep-feedback"><p>{error}</p><button type="button" className="prep-continue" onClick={() => setAttempt(value => value + 1)}>Retry preparation</button><Link className="prep-continue" href="/onboarding">Review preferences</Link></div>}
      {result && <div className="prep-feedback" role="status"><p>{result.planned ? result.planned + ' new daily schedules prepared across ' + result.days + ' calendar days.' : 'No new schedules added. Existing plans were kept; review any planning notes below.'} {result.pending && 'Device copies are waiting to sync.'}</p>{result.attention.length > 0 && <ul>{result.attention.map(note => <li key={note}>{note}</li>)}</ul>}</div>}
      {phase === 3 && <Link className="prep-continue" href="/">Continue to app <ArrowRight size={15} /></Link>}
    </section>
    <p className="prep-footer">MOVE. FUEL. FEEL GOOD.</p>
  </main>
}
