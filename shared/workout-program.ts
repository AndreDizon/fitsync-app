import type { OnboardingDraft } from './onboarding'

export const minimumWeeklyRestDays = 2
export const maximumTrainingDays = 7 - minimumWeeklyRestDays
export const workoutRestOptions = ['auto', '60', '90', '120', '180', '240', '300'] as const
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function validWorkoutDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01' && value <= '2200-12-31' && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value
}
export function workoutDayIndex(date: string) { return (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7 }
export function workoutDateAllowed(date: string, trainingDays: readonly string[]) {
  return validWorkoutDate(date) && trainingDays.includes(weekdays[workoutDayIndex(date)])
}
export function addWorkoutDays(date: string, offset: number) {
  const value = new Date(date + 'T12:00:00Z'); value.setUTCDate(value.getUTCDate() + offset)
  return value.toISOString().slice(0, 10)
}
// Nutrition continues on workout rest days; both use the same dated program boundary.
export function nutritionDateNote(profile: Pick<OnboardingDraft, 'workoutStartDate'>, date?: string): string | null {
  if (!profile.workoutStartDate) return null
  if (!date || !validWorkoutDate(date)) return 'Choose a calendar date before formulating your nutrition plan.'
  return date < profile.workoutStartDate ? `Your workout and nutrition plan starts on ${profile.workoutStartDate}. Choose that date or a later date.` : null
}
// Maximum nonconsecutive strength days, including recovery across Sunday/Monday.
export function strengthTrainingDays(trainingDays: readonly string[]): number[] {
  const selected = weekdays.map((day, index) => trainingDays.includes(day) ? index : -1).filter(index => index >= 0)
  let best: number[] = []
  for (let mask = 1; mask < 128; mask++) {
    const option = selected.filter(day => mask & (1 << day))
    if (option.length > 3 || option.some(day => option.includes((day + 1) % 7))) continue
    if (option.length > best.length) best = option
  }
  return best
}
// A user-visible arithmetic scenario, not an energy-balance or muscle-growth prediction.
export function workoutWeightOutlook(profile: Pick<OnboardingDraft, 'age' | 'heightCm' | 'weightKg' | 'targetWeightKg' | 'targetWeightPace' | 'days' | 'workoutStartDate' | 'nutritionContext'>) {
  const unavailable = (reason: string) => ({ date: null, reason, rate: null, weeks: null, sessions: null })
  if (profile.nutritionContext === 'review') return unavailable('Review your weight goals with a qualified professional. Automatic target dates are paused.')
  if (!profile.workoutStartDate || !workoutDateAllowed(profile.workoutStartDate, profile.days) || profile.days.length > maximumTrainingDays) return unavailable('Choose a training-day start date to see your outlook.')
  if (Number(profile.age) < 18 || !profile.age) return unavailable('For ages under 18, growth changes weight needs. A qualified professional should review weight goals; no target-weight date is calculated.')
  const current = Number(profile.weightKg), target = Number(profile.targetWeightKg), height = Number(profile.heightCm) / 100
  if (!(current >= 20 && current <= 350 && target >= 20 && target <= 350 && height >= 1 && height <= 2.5)) return unavailable('Enter valid height, current weight and target weight first.')
  if (current === target) return unavailable('Your target matches your current weight. Maintain your routine; there is no weight-change end date.')
  if (current / height ** 2 < 18.5 || current / height ** 2 >= 40 || target / height ** 2 < 18.5 || target / height ** 2 >= 40) return unavailable('This weight profile needs professional review before estimating a target date.')
  const rate = Number(profile.targetWeightPace || '0.25')
  if (![0.1, 0.25, 0.5].includes(rate) || target > current && rate > 0.25) return unavailable('Choose a supported weight-change assumption. Weight-gain scenarios use at most 0.25 kg per week.')
  const duration = Math.ceil(Math.abs(target - current) / rate * 7)
  if (duration > 730) return unavailable('This scenario extends beyond two years. Use a nearer review goal rather than a distant date.')
  const date = addWorkoutDays(profile.workoutStartDate, duration)
  if (!validWorkoutDate(date)) return unavailable('Choose a start date that keeps the estimated date within the supported calendar.')
  let sessions = 0
  for (let offset = 0; offset <= duration; offset++) if (workoutDateAllowed(addWorkoutDays(profile.workoutStartDate, offset), profile.days)) sessions++
  return { date, rate, weeks: Math.ceil(duration / 7), sessions, reason: `Assumes your entered current weight applies on the selected start date, followed by ${rate} kg of weight ${target < current ? 'loss' : 'gain'} per week. This is a scenario, not a personal forecast. Meals, consistency, health and metabolism affect actual results. Weight gain does not mean muscle gain. Rest days count toward calendar time.` }
}
/** A draft scheduling boundary, not a claim that the user's goal will be reached. */
export function initialPlanRange(profile: Pick<OnboardingDraft, 'age' | 'heightCm' | 'weightKg' | 'targetWeightKg' | 'targetWeightPace' | 'days' | 'workoutStartDate' | 'nutritionContext'>) {
  const start = profile.workoutStartDate || ''
  if (!validWorkoutDate(start) || !workoutDateAllowed(start, profile.days)) return null
  const outlook = workoutWeightOutlook(profile)
  const end = outlook.date || addWorkoutDays(start, 27)
  if (!validWorkoutDate(end)) return null
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1
  if (days < 1 || days > 731) return null
  return { start, end, days, basis: outlook.date ? 'scenario' as const : 'review' as const }
}
export function workoutDateNote(profile: Pick<OnboardingDraft, 'days' | 'workoutStartDate'>, date?: string): string | null {
  if (profile.days.length > maximumTrainingDays) return 'Update your training days: FitSync requires at least two rest days each week.'
  if (!profile.workoutStartDate) return null // Existing profiles without a dated program remain readable.
  if (!workoutDateAllowed(profile.workoutStartDate, profile.days)) return 'Choose a workout start date that falls on one of your training days.'
  if (!date || !validWorkoutDate(date)) return 'Choose a calendar date before formulating this dated workout program.'
  if (date < profile.workoutStartDate) return `Your workout program starts on ${profile.workoutStartDate}. Choose that date or a later training day.`
  if (!workoutDateAllowed(date, profile.days)) return 'This is a scheduled rest day. Choose one of your training days to formulate a workout.'
  return null
}
export function workoutRestPrescription(profile: Pick<OnboardingDraft, 'goal' | 'workoutRestSeconds'>, heavy = false, compound = false) {
  const strength = profile.goal === 'strength'
  const min = heavy || strength ? 120 : 60
  const max = heavy || strength ? 300 : profile.goal === 'endurance' ? 120 : 180
  const recommended = heavy || strength ? 180 : compound ? 120 : 90
  const selected = profile.workoutRestSeconds && profile.workoutRestSeconds !== 'auto' ? Number(profile.workoutRestSeconds) : recommended
  return { seconds: Math.max(min, Math.min(max, Number.isFinite(selected) ? selected : recommended)), min, max }
}
