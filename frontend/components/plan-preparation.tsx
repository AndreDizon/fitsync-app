'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Dumbbell, Utensils, Flag, ClipboardCheck } from 'lucide-react'
import { Wordmark } from './wordmark'
import { goalOptions, type OnboardingProfile } from '../../shared/onboarding'

const phases = [
  { title: 'Starting with your goal', description: 'Your direction comes first.', icon: Flag },
  { title: 'Bringing your workout preferences together', description: 'Your time, equipment, and experience.', icon: Dumbbell },
  { title: 'Organizing your meal preferences', description: 'Your eating preferences and food exclusions.', icon: Utensils },
  { title: 'Your planning blueprint is ready', description: 'One small step toward a routine that fits.', icon: ClipboardCheck },
]
export function PlanPreparation({ profile }: { profile: OnboardingProfile }) {
  const router = useRouter()
  const [elapsed, setElapsed] = useState(0)
  const phase = elapsed < 1300 ? 0 : elapsed < 2700 ? 1 : elapsed < 4100 ? 2 : 3
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
      if (visibleTime >= 5400) { window.clearInterval(timer); router.replace('/') }
    }, 100)
    return () => window.clearInterval(timer)
  }, [router])
  return <main className="plan-preparation">
    <div className="prep-brand"><img src="/mascot/fox-logo.png" alt="" width={36} height={36} /><Wordmark /></div>
    <section className="prep-content" aria-labelledby="prep-title">
      <div className="prep-mascot-stage" aria-hidden="true"><span className="prep-glow" /><span className="prep-orbit prep-workout"><Dumbbell size={25} /></span><span className="prep-orbit prep-food"><Utensils size={25} /></span><img src="/mascot/fox-greeting.png" width={1143} height={1358} alt="" /><span className="prep-fox-shadow" /></div>
      <p className="prep-eyebrow">EXERCISE + MEAL PLAN SETUP</p>
      <h1 id="prep-title">Putting your goals<br />into <em>motion.</em></h1>
      <p className="prep-intro">Preparing a blueprint around your life, one detail at a time.</p>
      <div className="prep-preferences"><span>{goal}</span><span>{profile.days.length} training days · {profile.sessionMinutes} min</span><span>{profile.diet}</span></div>
      <div className="prep-progress"><progress max={5400} value={elapsed} aria-label="Plan setup animation" /><div role="status" aria-live="polite" aria-atomic="true"><strong>{current.title}</strong><span>{current.description}</span></div></div>
      <ol className="prep-checklist" aria-label="Planning setup steps">{phases.slice(0, 3).map(({ title, icon: Icon }, index) => <li key={title} className={phase > index ? 'complete' : phase === index ? 'current' : ''}><span>{phase > index ? <Check size={14} /> : <Icon size={14} />}</span><span>{['Your goal', 'Exercise preferences', 'Meal preferences'][index]}</span></li>)}</ol>
      <p className="prep-note">Your preferences are saved. Personalized exercise and meal-plan generation will be connected next.</p>
      {phase === 3 && <Link className="prep-continue" href="/">Continue to app <ArrowRight size={15} /></Link>}
    </section>
    <p className="prep-footer">MOVE. FUEL. FEEL GOOD.</p>
  </main>
}
