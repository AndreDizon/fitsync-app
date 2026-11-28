'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Dumbbell, Utensils, Flag, ClipboardCheck } from 'lucide-react'
import { Wordmark } from './wordmark'
import { prepareInitialPlans } from '@/lib/daily-plans'
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
  useEffect(() => {
    let active = true
    setError(''); setResult(null)
    prepareInitialPlans(owner, profile).then(value => { if (active) setResult(value) }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Plan preparation could not finish. Please retry.') })
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
      <p className="prep-intro">Preparing seven days of workout and meal drafts from your shared start date.</p>
      <div className="prep-preferences"><span>{goal}</span><span>{profile.days.length} training days · {profile.sessionMinutes} min</span><span>{profile.diet}</span></div>
      <div className="prep-progress"><progress max={5400} value={result ? 5400 : Math.min(elapsed, 4500)} aria-label="Plan preparation progress" /><div role="status" aria-live="polite" aria-atomic="true"><strong>{current.title}</strong><span>{current.description}</span></div></div>
      <ol className="prep-checklist" aria-label="Planning setup steps">{phases.slice(0, 3).map(({ title, icon: Icon }, index) => <li key={title} className={phase > index ? 'complete' : phase === index ? 'current' : ''}><span>{phase > index ? <Check size={14} /> : <Icon size={14} />}</span><span>{['Your goal', 'Exercise preferences', 'Meal preferences'][index]}</span></li>)}</ol>
      <p className="prep-note">Your preferences are saved. Plans begin {formatWorkoutDate(profile.workoutStartDate || '')}. Meals continue on rest days. Review your first week before following it; future weeks can be formulated in My Plan.</p>
      {error && <div role="alert" className="prep-feedback"><p>{error}</p><button type="button" className="prep-continue" onClick={() => setAttempt(value => value + 1)}>Retry preparation</button><Link className="prep-continue" href="/onboarding">Review preferences</Link></div>}
      {result && <div className="prep-feedback" role="status"><p>{result.planned ? result.planned + ' new daily schedules prepared.' : 'No new schedules added. Existing plans were kept; review any planning notes below.'} {result.pending && 'Device copies are waiting to sync.'}</p>{result.attention.length > 0 && <ul>{result.attention.map(note => <li key={note}>{note}</li>)}</ul>}</div>}
      {phase === 3 && <Link className="prep-continue" href="/">Continue to app <ArrowRight size={15} /></Link>}
    </section>
    <p className="prep-footer">MOVE. FUEL. FEEL GOOD.</p>
  </main>
}
