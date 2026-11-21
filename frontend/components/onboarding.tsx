'use client'

import { useActionState, useEffect, useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Dumbbell, Utensils, ShieldCheck, Clock3, Flag, UserRound, ClipboardCheck, Activity, Flame, Trophy, HeartPulse, Move } from 'lucide-react'
import { Wordmark } from './wordmark'
import { BodyFocusMap } from './body-focus-map'
import { HealthReference } from './health-reference'
import { activityDescriptions, eatingPreferenceDescriptions, experienceDescriptions, suggestSessionMinutes } from '@/lib/health-guidance'
import { signOut } from '@/app/auth/actions'
import { saveOnboarding } from '@/app/onboarding/actions'
import { minimumOnboardingAge, sessionMinuteOptions, goalOptions, focusOptions, genderOptions, days, equipmentOptions, dietOptions, allergyOptions, adjustmentOptions, emptyOnboarding, validateOnboarding, targetWeightGoalError, type OnboardingDraft, type OnboardingProfile } from '../../shared/onboarding'
import { youthActivityOptions, youthActivityDescriptions } from '../../shared/youth-energy'

const steps = [
  { label: 'Your goal', title: 'What are we working toward?', note: 'Choose one main goal. You can update it as your priorities change.', icon: Flag },
  { label: 'Your starting point', title: 'A little about you.', note: 'Help us understand your starting point, beyond a number on the scale.', icon: UserRound },
  { label: 'Your movement', title: 'Make room for movement.', note: 'A routine should fit your life. Tell us what a realistic week looks like.', icon: Dumbbell },
  { label: 'Your food', title: 'Fuel it your way.', note: 'Your food preferences help shape the meal plans you generate in My Plan.', icon: Utensils },
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
function Choices({ legend, options, value, onChange, multiple = false, hint, descriptions, suggested }: { legend: string; options: readonly string[]; value: string | string[]; onChange: (value: string) => void; multiple?: boolean; hint?: string; descriptions?: Record<string, string>; suggested?: string }) {
  return <fieldset className="onb-choices"><legend>{legend}</legend>{hint && <p>{hint}</p>}<div>{options.map(option => {
    const selected = Array.isArray(value) ? value.includes(option) : value === option
    return <label key={option} className={selected ? 'selected' : ''}><input type={multiple ? 'checkbox' : 'radio'} name={legend} checked={selected} onChange={() => onChange(option)} /><span>{option}</span>{suggested === option && <small className="onb-suggested-label">Suggested</small>}{selected && <Check size={15} aria-hidden="true" />}</label>
  })}</div>{descriptions && typeof value === 'string' && descriptions[value] && <p className="onb-choice-description" role="status">{descriptions[value]}</p>}</fieldset>
}
export function Onboarding({ name, profile }: { name: string; profile: OnboardingProfile | null }) {
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({ ...emptyOnboarding, ...profile }))
  const targetError = targetWeightGoalError(draft)
  const targetMaximum = draft.goal === 'fat_loss' && Number(draft.weightKg) >= 20 && Number(draft.weightKg) <= 350 ? Number(draft.weightKg) : 350
  const sessionSuggestion = suggestSessionMinutes(draft)
  const teen = Number(draft.age) >= 13 && Number(draft.age) < 18
  const [timeZones, setTimeZones] = useState<string[]>(['Asia/Manila', 'UTC'])
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    const supported = (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['Asia/Manila', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney']
    setTimeZones([...new Set([...supported, detected, profile?.timeZone || 'Asia/Manila', 'UTC'])].sort())
    if (!profile) setDraft(previous => ({ ...previous, timeZone: detected }))
  }, [profile])
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
  const checkBeforeReturning = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pending) { event.preventDefault(); return }
    const problems = validateOnboarding(draft)
    if (!problems.length) return
    event.preventDefault()
    const missingStep = [0, 1, 2, 3].find(index => validateOnboarding(draft, index).length > 0)
    setStep(missingStep ?? step)
    setErrors(['Please complete the required information before returning to the app.', ...problems])
  }
  const current = steps[step]
  const CurrentIcon = current.icon
  const goalLabel = goalOptions.find(([key]) => key === draft.goal)?.[1] ?? 'Choose a goal'
  return <main className="onboarding-page">
    <header className="onb-header"><Link href={profile ? '/' : '/onboarding'} className="onb-brand" aria-label="FitSync"><img src="/mascot/optimized/fox-logo-192.webp" width={36} height={36} alt="" /><Wordmark /></Link><span>YOUR NEXT CHAPTER</span>{profile ? <Link href="/" className="onb-return" aria-disabled={pending} onClick={checkBeforeReturning}>Back to app</Link> : <form action={signOut}><button type="submit">Sign out</button></form>}</header>
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
              <label className="onb-input">Time zone<select value={draft.timeZone} onChange={event => update('timeZone', event.target.value)}>{timeZones.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</select><small>Your plan dates and scheduled times follow this time zone, including daylight-saving changes.</small></label>
              <label className="onb-input">Age in years<input type="number" required inputMode="numeric" min={minimumOnboardingAge} max={120} step={1} aria-label="Age in years" aria-describedby="onb-age-help" placeholder="e.g. 25" value={draft.age} onChange={event => update('age', event.target.value)} /><small id="onb-age-help">For ages {minimumOnboardingAge} and older. Enter your age in whole years.</small></label>
              <Choices legend="Gender" options={genderOptions} value={draft.gender} onChange={value => update('gender', value)} hint="Choose Prefer not to say if you’d rather keep this private." />
              <Choices legend="Activity outside workouts" options={['Mostly seated', 'Lightly active', 'Moderately active', 'Very active']} value={draft.activity} onChange={value => update('activity', value)} descriptions={activityDescriptions} hint="Think about a typical day of work, study, walking and errands. Choose your usual activity, not the level you hope to reach." />
              {teen && <Choices legend="Total daily activity, including exercise" options={youthActivityOptions} value={draft.youthActivity || ''} onChange={value => update('youthActivity', value)} descriptions={youthActivityDescriptions} hint="Required for the teen energy equation. Include school, walking, active travel, exercise and sport across a typical day. This self-report is an estimate, not a measured activity level." />}
              <div className="onb-input-row"><label>Height in cm <small>Required</small><input type="number" required inputMode="decimal" min={100} max={250} step="0.01" placeholder="e.g. 165" value={draft.heightCm} onChange={event => update('heightCm', event.target.value)} /></label><label>Current weight in kg <small>Required</small><input type="number" required inputMode="decimal" min={20} max={350} step="0.01" placeholder="e.g. 70" value={draft.weightKg} onChange={event => update('weightKg', event.target.value)} /></label></div>
              <label className="onb-input">Target weight in kg <small id="onb-target-help">{draft.goal === 'fat_loss' ? 'Required - choose a target at or below your current weight.' : 'Required - use your current weight if you want to maintain it.'}</small><input type="number" required inputMode="decimal" min={20} max={targetMaximum} step="0.01" placeholder="Your target weight" value={draft.targetWeightKg} aria-invalid={!!targetError} aria-describedby={targetError ? 'onb-target-help onb-target-error' : 'onb-target-help'} onChange={event => update('targetWeightKg', event.target.value)} />{targetError && <small id="onb-target-error" role="alert">{targetError}</small>}</label>
              <p className="onb-note"><ShieldCheck size={17} />{teen ? 'Your age, height, current weight and total daily activity support a teen growth-energy estimate. Target weight does not reduce this estimate or create a weight-loss deadline.' : 'Height and current weight help estimate adult calorie needs with age and activity. Target weight checks your goal direction and supports progress forecasts when enough records are available.'}</p>
              <HealthReference title="How your answers shape calorie estimates" sources={teen ? ['youthEnergy','macroRanges','youthNutrition'] : ['energy']}>
                {teen ? <><p>For ages 13–17, FitSync uses the 2023 Dietary Reference Intake EER equations with an allowance for growth. The equation uses total daily activity including exercise, not just activity outside workouts. Self-selected activity categories are approximate; needs change with growth and training.</p><p>Both published sex-coefficient results form the reference range. Gender is not treated as biological sex. The midpoint supports menu planning; it is not a calorie ceiling or a validated individual target. No weight-loss deficit or muscle-gain surplus is applied. Macro allocations are 20% protein, 50% carbohydrate and 30% fat, within the youth AMDR ranges. They do not guarantee a complete diet. Pregnancy, breastfeeding and medical nutrition needs require individual guidance.</p><p>Target-weight dates remain unavailable for teens: an energy equation does not predict a healthy growth path or a safe weight-loss timeline.</p></> : <><p>FitSync estimates resting energy with Mifflin–St Jeor, then applies an activity multiplier. Weight-loss or muscle-gain goals can apply a 10% adjustment; conflicting target weights use maintenance instead. These are planning estimates; your actual needs may differ.</p><p>The equation’s two sex coefficients form a reference range. Your gender answer is not used as biological sex, and that range is not a clinical confidence interval. Macro targets are app allocations, not a dietitian’s prescription.</p></>}
                <p>Energy estimates require the needed measurements and activity information and must fall within the app’s supported range. Pregnancy, breastfeeding, medical conditions or a history of disordered eating need individualized professional advice; these questions do not screen for them.</p>
              </HealthReference>
            </>}
            {step === 2 && <>
              <Choices legend="Training experience" options={['Beginner', 'Intermediate', 'Advanced']} value={draft.experience} onChange={value => update('experience', value)} descriptions={experienceDescriptions} hint="Choose based on technique and recent training experience, not how heavy you can lift. Start with Beginner if unsure." />
              <Choices legend="Preferred training days" options={days} value={draft.days} onChange={value => toggle('days', value)} multiple hint="Pick 1–6 days. Keep at least one day for recovery." />
              <div className="onb-input onb-workout-start"><label htmlFor="workout-start-time">What time would you like to start your workout?</label><small id="workout-start-help">Your first exercise starts here. Later exercises follow using their estimated durations. Local time in {draft.timeZone.replaceAll('_', ' ')}. Applies when you generate a new day.</small><input id="workout-start-time" type="time" step={60} value={draft.workoutStartTime} aria-describedby="workout-start-help" onClick={event => { if (event.currentTarget.showPicker) { event.preventDefault(); event.currentTarget.focus(); try { event.currentTarget.showPicker() } catch { /* Native text editing remains available. */ } } }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); try { event.currentTarget.showPicker?.() } catch { event.currentTarget.focus() } } }} onChange={event => update('workoutStartTime', event.target.value)} /></div>
              <section className="onb-session-settings" aria-label="Session duration">
              <Choices legend="Minutes per session" options={sessionMinuteOptions} value={draft.sessionMinutes} onChange={value => update('sessionMinutes', value)} suggested={sessionSuggestion?.minutes} hint="Includes warm-up, exercise, rest and cooldown. Choose what fits your day." />
              <HealthReference className="onb-session-recommendation" title={<span className="onb-session-guidance">
                  {sessionSuggestion ? <><strong>{sessionSuggestion.minutes} min recommended <span>&middot; FitSync estimate</span></strong><span className="onb-session-basis">Age {draft.age} &middot; {draft.experience} &middot; {goalOptions.find(([key])=>key===draft.goal)?.[1] || 'Goal not selected'} &middot; {draft.days.length ? `${draft.days.length} days/week` : 'Choose training days'}</span>{sessionSuggestion.youth && <span>Strength work needs qualified supervision. This session is part of your daily activity.</span>}</> : <span>{!draft.age || !/^\d+$/.test(draft.age) || Number(draft.age)>120 ? 'Enter your age to see a recommendation.' : Number(draft.age)<13 ? 'Under 13: plan age-appropriate activity with a parent or qualified instructor.' : 'Choose your training experience to see a recommendation.'}</span>}
                </span>} sources={Number(draft.age)>=13 && Number(draft.age)<18 ? ['youthStrength','youthActivity'] : ['strength','activity']}>
                {sessionSuggestion && <p>{sessionSuggestion.reason} You can choose another duration; changing your answers will not overwrite your selection.</p>}
                <p>FitSync uses a starting budget of 30 minutes for adult beginners, 45 for intermediate users and 60 for advanced users. A mobility goal uses 30 minutes. Four or more training days cap the adult suggestion at 45 minutes to spread the workload. These are app planning choices, not research-established time standards for each level.</p>
                <p>For ages 13–17, FitSync suggests a compact 30-minute starting budget rather than scaling up an adult duration. AAP guidance describes 20–30-minute youth strength sessions 2–3 times a week with proper supervision. CDC guidance for ages 6–17 calls for at least 60 minutes of daily activity, including muscle- and bone-strengthening activity on at least 3 days; that includes activity outside gym sessions.</p>
                <p>Gender, height and weight do not provide a validated formula for session length. Training volume, intensity, rest, recovery and available time matter. The recommendation updates with your answers but never changes your selected duration.</p>
              </HealthReference>
              </section>
              <Choices legend="Equipment available" options={equipmentOptions} value={draft.equipment} onChange={value => toggle('equipment', value)} multiple />
              <Choices legend="Movement preferences" options={adjustmentOptions} value={draft.adjustments} onChange={value => toggle('adjustments', value)} multiple hint="Optional. Select anything your workout plan should accommodate." />
              <p className="onb-note">These preferences guide the workouts you generate in My Plan, including your training days, start time, session length and available equipment. You can adjust exercises, times and targets there.</p>
              <HealthReference title="Build a week you can recover from" sources={['activity', 'strength']}>
                <p>For adults, WHO recommends 150–300 minutes of moderate aerobic activity or 75–150 minutes of vigorous activity weekly, plus muscle-strengthening work on at least two days. Start with what you can manage and build gradually.</p>
                <p>Your session budget includes rest and setup, so it does not equal aerobic activity minutes. Keep exercise technique controlled and adjust the template to your ability. Rest days and easier days belong in a sustainable routine.</p>
                <p>Movement preferences filter the catalog; they are not an injury assessment. For pain, injury or a condition affecting exercise, ask a qualified professional about suitable movements.</p>
              </HealthReference>
            </>}
            {step === 3 && <>
              <Choices legend="Eating preference" options={dietOptions} value={draft.diet} onChange={value => update('diet', value)} descriptions={eatingPreferenceDescriptions} />
              <Choices legend="Food allergies" options={['No known food allergies', ...allergyOptions]} value={draft.allergiesReviewed && !draft.allergies.length ? ['No known food allergies'] : draft.allergies} onChange={value => value === 'No known food allergies' ? setDraft(previous => ({ ...previous, allergies: [], otherAllergy: '', allergiesReviewed: true })) : toggle('allergies', value)} multiple hint="Allergies will be treated as exclusions, not optional preferences." />
              {draft.allergies.includes('Other') && <label className="onb-input">Other food allergy<input maxLength={120} value={draft.otherAllergy} onChange={event => update('otherAllergy', event.target.value)} placeholder="Tell us which food to exclude" /></label>}
              <label className="onb-input">Foods you prefer to avoid <small>Optional</small><input maxLength={200} value={draft.dislikes} onChange={event => update('dislikes', event.target.value)} placeholder="e.g. mushrooms, olives" /></label>
              <div className="onb-input-row"><Choices legend="Meals per day" options={['2', '3', '4', '5']} value={draft.mealsPerDay} onChange={value => update('mealsPerDay', value)} hint="Choose a meal schedule you can maintain. More meals do not automatically mean better results." /><Choices legend="Cooking minutes per meal" options={['15', '30', '45', '60']} value={draft.cookingMinutes} onChange={value => update('cookingMinutes', value)} hint="Approximate time available. Actual preparation varies by recipe, equipment and batch size." /></div>
              <Choices legend="Food budget" options={['Budget-friendly', 'Moderate', 'Flexible']} value={draft.budget} onChange={value => update('budget', value)} />
              <p className="onb-note">These preferences guide the meal plans you generate in My Plan. You can adjust foods and portions there. Always check food labels and cross-contact information for allergies.</p>
              <HealthReference title="What makes a balanced food plan?" sources={['diet', 'foodData']}>
                <p>Build variety across vegetables, fruit, grains or other starchy foods, protein foods and suitable fats. Calories and protein alone do not describe overall diet quality.</p>
                <p>The generator creates ingredient-and-portion drafts from your preferences. It does not guarantee a complete diet or create recipes. Library portions are reference amounts, not a serving recommendation for everyone.</p>
                <p>Listed allergies are exclusions. Unlisted allergens and cross-contact still need checking; an Other allergy requires individual review. Halal ingredient compatibility is not product certification. Budget labels are relative estimates, not live prices.</p>
              </HealthReference>
            </>}
            {step === 4 && <>
              <div className="onb-summary-goal"><Flag size={24} /><div><small>YOUR MAIN GOAL</small><h2>{goalLabel}</h2></div></div>
              <div className="onb-summary-grid">{[
                { icon: Flag, title: 'Focus areas', edit: 0, rows: [draft.focusAreas.join(', ')] },
                { icon: UserRound, title: 'Starting point', edit: 1, rows: [draft.timeZone.replaceAll('_', ' '), draft.age ? `${draft.age} years · ${draft.gender}` : draft.ageRange, draft.activity, ...(teen ? ['Total daily activity: ' + (draft.youthActivity || 'Not set')] : []), [draft.heightCm && `${draft.heightCm} cm`, draft.weightKg && `${draft.weightKg} kg`].filter(Boolean).join(' · ') || 'Measurements required', draft.targetWeightKg ? `Target weight: ${draft.targetWeightKg} kg` : 'Target weight required'] },
                { icon: Dumbbell, title: 'Movement', edit: 2, rows: [draft.experience, 'Workout starts at ' + draft.workoutStartTime + ' (' + draft.timeZone + ')', `${days.filter(day => draft.days.includes(day)).join(', ')} · ${draft.sessionMinutes} min`, draft.equipment.join(', '), draft.adjustments.join(', ') || 'No movement preferences selected'] },
                { icon: Utensils, title: 'Food preferences', edit: 3, rows: [draft.diet, `${draft.mealsPerDay} meals · ${draft.cookingMinutes} min cooking`, draft.budget, draft.allergies.length ? `Allergies: ${draft.allergies.join(', ')}${draft.otherAllergy ? ` (${draft.otherAllergy})` : ''}` : 'No known food allergies', draft.dislikes ? `Avoid: ${draft.dislikes}` : 'No food dislikes added'] },
              ].map(({ icon: Icon, title, edit, rows }) => <article key={title}><div><Icon size={19} /><h3>{title}</h3><button type="button" onClick={() => move(edit)}>Edit</button></div>{rows.map((row, index) => <p key={index}>{row}</p>)}</article>)}</div>
              <p className="onb-note"><Clock3 size={18} />Your workout start time and session length guide new exercise schedules. You can edit individual times in My Plan.</p>
            </>}
          </fieldset>
          {(errors.length > 0 || state.error) && <div className="onb-errors" role="alert" tabIndex={-1} ref={errorBox}>{errors.length ? <><strong>A few things to check</strong><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></> : state.error}</div>}
          <div className="onb-actions"><button type="button" className="onb-back" disabled={step === 0 || pending} onClick={() => move(step - 1)}><ArrowLeft size={17} />Back</button><button type="submit" className="onb-next" disabled={pending}>{pending ? 'Saving your preferences…' : step === 4 ? 'Save and continue' : 'Continue'}<ArrowRight size={18} /></button></div>
          <p className="onb-private"><ShieldCheck size={14} />You can edit these preferences in Settings.</p>
        </form>
      </section>
    </div>
  </main>
}
