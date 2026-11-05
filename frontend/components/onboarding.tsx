'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Dumbbell, Utensils, ShieldCheck, Clock3, Flag, UserRound, ClipboardCheck, Activity, Flame, Trophy, HeartPulse, Move } from 'lucide-react'
import { Wordmark } from './wordmark'
import { BodyFocusMap } from './body-focus-map'
import { signOut } from '@/app/auth/actions'
import { saveOnboarding } from '@/app/onboarding/actions'
import { goalOptions, focusOptions, genderOptions, days, equipmentOptions, dietOptions, allergyOptions, adjustmentOptions, emptyOnboarding, validateOnboarding, type OnboardingDraft, type OnboardingProfile } from '../../shared/onboarding'

const steps = [
  { label: 'Your goal', title: 'What are we working toward?', note: 'Choose one main goal. You can update it as your priorities change.', icon: Flag },
  { label: 'Your starting point', title: 'A little about you.', note: 'Help us understand your starting point, beyond a number on the scale.', icon: UserRound },
  { label: 'Your movement', title: 'Make room for movement.', note: 'A routine should fit your life. Tell us what a realistic week looks like.', icon: Dumbbell },
  { label: 'Your food', title: 'Fuel it your way.', note: 'Your food preferences will help shape meal planning when our meal library is ready.', icon: Utensils },
  { label: 'Your blueprint', title: 'A little more you.', note: 'Review your preferences before saving. You can come back and change them anytime.', icon: ClipboardCheck },
]
const goalIcons = [Activity, Flame, Dumbbell, Trophy, HeartPulse, Move]
const coachQuestions = [
  'Hey, teammate! What would you love to work toward?',
  'Where are we starting? Tell me a little about your everyday routine.',
  'When can we get moving, and what equipment do you have?',
  'What do you enjoy eating, and which foods should we leave out?',
  'Does this feel like you? Let’s check your choices before we save!',
]
function OnboardingCoach({ question, mobile = false }: { question: string; mobile?: boolean }) {
  return <div className={`onb-coach ${mobile ? 'onb-coach-mobile' : 'onb-coach-desktop'}`}>
    <div className="onb-coach-bubble"><span>YOUR FOX COACH</span><p>{question}</p></div>
    <img src="/mascot/fox-greeting.png" width={1143} height={1358} alt="Your friendly FitSync fox coach" />
  </div>
}
function Choices({ legend, options, value, onChange, multiple = false, hint }: { legend: string; options: readonly string[]; value: string | string[]; onChange: (value: string) => void; multiple?: boolean; hint?: string }) {
  return <fieldset className="onb-choices"><legend>{legend}</legend>{hint && <p>{hint}</p>}<div>{options.map(option => {
    const selected = Array.isArray(value) ? value.includes(option) : value === option
    return <label key={option} className={selected ? 'selected' : ''}><input type={multiple ? 'checkbox' : 'radio'} name={legend} checked={selected} onChange={() => onChange(option)} /><span>{option}</span>{selected && <Check size={15} aria-hidden="true" />}</label>
  })}</div></fieldset>
}
export function Onboarding({ name, profile }: { name: string; profile: OnboardingProfile | null }) {
  const [draft, setDraft] = useState<OnboardingDraft>(() => profile ? { ...profile } : { ...emptyOnboarding })
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [state, action, pending] = useActionState(saveOnboarding, {})
  const heading = useRef<HTMLHeadingElement>(null)
  const errorBox = useRef<HTMLDivElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }) }, [step])
  useEffect(() => { if (errors.length || state.error) errorBox.current?.focus() }, [errors, state.error])
  const update = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => { setErrors([]); setDraft(previous => ({ ...previous, [key]: value })) }
  const toggle = (key: 'days' | 'equipment' | 'adjustments' | 'allergies', value: string) => {
    setErrors([])
    setDraft(previous => {
      const selected = previous[key].includes(value)
      return { ...previous, [key]: selected ? previous[key].filter(item => item !== value) : [...previous[key], value], ...(key === 'allergies' ? { allergiesReviewed: true, otherAllergy: value === 'Other' && selected ? '' : previous.otherAllergy } : {}) }
    })
  }
  const move = (next: number) => { setErrors([]); setStep(next) }
  const toggleFocus = (area: string) => {
    setErrors([])
    setDraft(previous => ({ ...previous, focusAreas: area === 'Overall' ? ['Overall'] : previous.focusAreas.includes(area) ? previous.focusAreas.filter(item => item !== area) : [...previous.focusAreas.filter(item => item !== 'Overall'), area] }))
  }
  const next = () => { const problems = validateOnboarding(draft, step); if (problems.length) setErrors(problems); else move(step + 1) }
  const current = steps[step]
  const CurrentIcon = current.icon
  const goalLabel = goalOptions.find(([key]) => key === draft.goal)?.[1] ?? 'Choose a goal'
  return <main className="onboarding-page">
    <header className="onb-header"><Link href={profile ? '/' : '/onboarding'} className="onb-brand" aria-label="FitSync"><img src="/mascot/fox-logo.png" width={36} height={36} alt="" /><Wordmark /></Link><span>YOUR NEXT CHAPTER</span>{profile ? <Link href="/">Back to app</Link> : <form action={signOut}><button type="submit">Sign out</button></form>}</header>
    <div className="onb-layout">
      <aside className="onb-story">
        <svg className="onb-story-lines" viewBox="0 0 400 700" fill="none" aria-hidden="true"><path d="M-80 65C310-40 420 130 185 275S-60 550 450 590M-80 90C310-15 440 150 205 295S-40 570 470 610M-80 115C310 10 460 170 225 315S-20 590 490 630" /></svg>
        <p className="onb-eyebrow">LET’S FIND YOUR RHYTHM</p><h2>Small steps.<br /><em>Your direction.</em></h2><p>Hi {name}. Let’s start with a plan that fits you, from your first rep to your next meal.</p>
        <ol aria-label="Onboarding progress">{steps.map(({ label, icon: Icon }, index) => <li key={label} className={index === step ? 'current' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined}><span>{index < step ? <Check size={17} /> : <Icon size={17} />}</span><div><small>STEP {index + 1}</small><strong>{label}</strong></div></li>)}</ol>
        <OnboardingCoach question={coachQuestions[step]} />
      </aside>
      <section className="onb-content" aria-labelledby="onb-title">
        <div className="onb-step-heading"><span>STEP {step + 1} OF {steps.length}</span><span>About 3 minutes</span></div>
        <progress value={step + 1} max={steps.length} aria-label="Onboarding progress" />
        <div className="onb-mobile-steps" aria-hidden="true">{steps.map(({ icon: Icon, label }, index) => <span key={label} className={index === step ? 'current' : index < step ? 'complete' : ''}>{index < step ? <Check size={15} /> : <Icon size={15} />}</span>)}</div>
        <OnboardingCoach question={coachQuestions[step]} mobile />
        <div className="onb-section-kicker"><CurrentIcon size={15} aria-hidden="true" /><span>{current.label}</span></div>
        <h1 id="onb-title" ref={heading} tabIndex={-1}>{current.title}</h1><p className="onb-intro">{current.note}</p>
        <form action={action} noValidate onSubmit={event => {
          if (step !== 4) { event.preventDefault(); next(); return }
          const problems = validateOnboarding(draft)
          if (problems.length) { event.preventDefault(); setErrors(problems) }
        }}>
          <input type="hidden" name="profile" value={JSON.stringify(draft)} />
          <fieldset className="onb-fields" key={step} disabled={pending}>
            {step === 0 && <><div className="onb-goals" role="radiogroup" aria-label="Main goal">{goalOptions.map(([key, label, description], index) => {
              const GoalIcon = goalIcons[index]
              return <label className={`onb-goal ${draft.goal === key ? 'selected' : ''}`} key={key}><input type="radio" name="goal" value={key} checked={draft.goal === key} onChange={() => update('goal', key)} /><span className="onb-goal-number"><GoalIcon size={20} aria-hidden="true" /></span><span><strong>{label}</strong><small>{description}</small></span><span className="onb-goal-check">{draft.goal === key && <Check size={15} />}</span></label>
            })}</div><section className="onb-focus-section" aria-label="Choose body focus"><BodyFocusMap selected={draft.focusAreas} /><Choices legend="Primary focus areas" options={focusOptions} value={draft.focusAreas} onChange={toggleFocus} multiple hint="Choose Overall for a balanced routine, or select several areas you want to prioritize." /></section></>}
            {step === 1 && <>
              <label className="onb-check"><input type="checkbox" checked={draft.adult} onChange={event => update('adult', event.target.checked)} /><span>I’m 18 or older.</span></label>
              <label className="onb-input">Age in years<input type="number" inputMode="numeric" min={18} max={120} step={1} placeholder="e.g. 25" value={draft.age} onChange={event => update('age', event.target.value)} /></label>
              <Choices legend="Gender" options={genderOptions} value={draft.gender} onChange={value => update('gender', value)} hint="Choose Prefer not to say if you’d rather keep this private." />
              <Choices legend="Activity outside workouts" options={['Mostly seated', 'Lightly active', 'Moderately active', 'Very active']} value={draft.activity} onChange={value => update('activity', value)} hint="Think about your usual work, study, walking and daily errands." />
              <div className="onb-input-row"><label>Height in cm <small>Optional</small><input type="number" inputMode="decimal" min={100} max={250} placeholder="e.g. 165" value={draft.heightCm} onChange={event => update('heightCm', event.target.value)} /></label><label>Current weight in kg <small>Optional</small><input type="number" inputMode="decimal" min={20} max={350} step="0.1" placeholder="e.g. 70" value={draft.weightKg} onChange={event => update('weightKg', event.target.value)} /></label></div>
              <label className="onb-input">Target weight in kg <small>Optional — leave blank if your goal is not weight-based</small><input type="number" inputMode="decimal" min={20} max={350} step="0.1" placeholder="Your preferred target, if you have one" value={draft.targetWeightKg} onChange={event => update('targetWeightKg', event.target.value)} /></label>
              <p className="onb-note"><ShieldCheck size={17} />You can leave measurements blank. Weight helps refine exercise energy estimates; it doesn’t define your progress.</p>
            </>}
            {step === 2 && <>
              <Choices legend="Training experience" options={['Beginner', 'Intermediate', 'Advanced']} value={draft.experience} onChange={value => update('experience', value)} />
              <Choices legend="Preferred training days" options={days} value={draft.days} onChange={value => toggle('days', value)} multiple hint="Pick 1–6 days. Keep at least one day for recovery." />
              <Choices legend="Minutes per session" options={['15', '20', '30', '45', '60']} value={draft.sessionMinutes} onChange={value => update('sessionMinutes', value)} />
              <Choices legend="Equipment available" options={equipmentOptions} value={draft.equipment} onChange={value => toggle('equipment', value)} multiple />
              <Choices legend="Movement preferences" options={adjustmentOptions} value={draft.adjustments} onChange={value => toggle('adjustments', value)} multiple hint="Optional. Select anything a future plan should accommodate." />
              {draft.adjustments.includes('Need professional guidance') && <p className="onb-note">We’ll save this preference. An exercise professional should help adapt a plan before you start if you have an injury, symptoms or a condition affecting exercise.</p>}
            </>}
            {step === 3 && <>
              <Choices legend="Eating preference" options={dietOptions} value={draft.diet} onChange={value => update('diet', value)} />
              <Choices legend="Food allergies" options={['No known food allergies', ...allergyOptions]} value={draft.allergiesReviewed && !draft.allergies.length ? ['No known food allergies'] : draft.allergies} onChange={value => value === 'No known food allergies' ? setDraft(previous => ({ ...previous, allergies: [], otherAllergy: '', allergiesReviewed: true })) : toggle('allergies', value)} multiple hint="Allergies will be treated as exclusions, not optional preferences." />
              {draft.allergies.includes('Other') && <label className="onb-input">Other food allergy<input maxLength={120} value={draft.otherAllergy} onChange={event => update('otherAllergy', event.target.value)} placeholder="Tell us which food to exclude" /></label>}
              <label className="onb-input">Foods you prefer to avoid <small>Optional</small><input maxLength={200} value={draft.dislikes} onChange={event => update('dislikes', event.target.value)} placeholder="e.g. mushrooms, olives" /></label>
              <div className="onb-input-row"><Choices legend="Meals per day" options={['2', '3', '4', '5']} value={draft.mealsPerDay} onChange={value => update('mealsPerDay', value)} /><Choices legend="Cooking minutes per meal" options={['15', '30', '45', '60']} value={draft.cookingMinutes} onChange={value => update('cookingMinutes', value)} /></div>
              <Choices legend="Food budget" options={['Budget-friendly', 'Moderate', 'Flexible']} value={draft.budget} onChange={value => update('budget', value)} />
              <p className="onb-note">Meal planning is coming after the food library. We’ll save these preferences now. Always check food labels and cross-contact information for allergies.</p>
            </>}
            {step === 4 && <>
              <div className="onb-summary-goal"><Flag size={24} /><div><small>YOUR MAIN GOAL</small><h2>{goalLabel}</h2></div></div>
              <div className="onb-summary-grid">{[
                { icon: Flag, title: 'Focus areas', edit: 0, rows: [draft.focusAreas.join(', ')] },
                { icon: UserRound, title: 'Starting point', edit: 1, rows: [draft.age ? `${draft.age} years · ${draft.gender}` : draft.ageRange, draft.activity, [draft.heightCm && `${draft.heightCm} cm`, draft.weightKg && `${draft.weightKg} kg`].filter(Boolean).join(' · ') || 'Measurements not provided', draft.targetWeightKg ? `Target weight: ${draft.targetWeightKg} kg` : 'No target weight set'] },
                { icon: Dumbbell, title: 'Movement', edit: 2, rows: [draft.experience, `${days.filter(day => draft.days.includes(day)).join(', ')} · ${draft.sessionMinutes} min`, draft.equipment.join(', '), draft.adjustments.join(', ') || 'No movement preferences selected'] },
                { icon: Utensils, title: 'Food preferences', edit: 3, rows: [draft.diet, `${draft.mealsPerDay} meals · ${draft.cookingMinutes} min cooking`, draft.budget, draft.allergies.length ? `Allergies: ${draft.allergies.join(', ')}${draft.otherAllergy ? ` (${draft.otherAllergy})` : ''}` : 'No known food allergies', draft.dislikes ? `Avoid: ${draft.dislikes}` : 'No food dislikes added'] },
              ].map(({ icon: Icon, title, edit, rows }) => <article key={title}><div><Icon size={19} /><h3>{title}</h3><button type="button" onClick={() => move(edit)}>Edit</button></div>{rows.map((row, index) => <p key={index}>{row}</p>)}</article>)}</div>
              <p className="onb-note"><Clock3 size={18} />This saves your planning blueprint. Exercise and meal-plan generation will use it when those features are connected; saving does not generate a plan yet.</p>
            </>}
          </fieldset>
          {(errors.length > 0 || state.error) && <div className="onb-errors" role="alert" tabIndex={-1} ref={errorBox}>{errors.length ? <><strong>A few things to check</strong><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></> : state.error}</div>}
          <div className="onb-actions"><button type="button" className="onb-back" disabled={step === 0 || pending} onClick={() => move(step - 1)}><ArrowLeft size={17} />Back</button><button type="submit" className="onb-next" disabled={pending}>{pending ? 'Saving your preferences…' : step === 4 ? 'Save and continue' : 'Continue'}<ArrowRight size={18} /></button></div>
          <p className="onb-private"><ShieldCheck size={14} />Preferences are saved to your signed-in account. You can edit them in Settings.</p>
        </form>
      </section>
    </div>
  </main>
}
