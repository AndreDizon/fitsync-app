export const goalOptions = [
  ['general_fitness', 'Feel fitter', 'Build a balanced, sustainable routine.'],
  ['fat_loss', 'Lose body fat', 'Move more and build consistent eating habits.'],
  ['muscle_gain', 'Build muscle', 'Focus on progressive training and supportive meals.'],
  ['strength', 'Get stronger', 'Build confidence and strength over time.'],
  ['endurance', 'Improve endurance', 'Keep going with more energy.'],
  ['mobility', 'Move more freely', 'Prioritize comfortable movement and flexibility.'],
] as const
export const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const equipmentOptions = ['Bodyweight', 'Dumbbells', 'Barbell', 'Resistance bands', 'Cable machine', 'Gym machines', 'Kettlebell'] as const
export const dietOptions = ['No preference', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal'] as const
export const allergyOptions = ['Milk', 'Eggs', 'Fish', 'Shellfish', 'Peanuts', 'Tree nuts', 'Soy', 'Wheat', 'Sesame', 'Other'] as const
export const adjustmentOptions = ['Low impact / no jumping', 'Avoid overhead movements', 'Avoid kneeling'] as const
export const focusOptions = ['Overall', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'] as const
export const genderOptions = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'] as const
export type Goal = typeof goalOptions[number][0]
export type OnboardingDraft = {
  goal: Goal | ''; timeZone: string; ageRange: string; age: string; gender: string; heightCm: string; weightKg: string; targetWeightKg: string; focusAreas: string[];
  activity: string; experience: string; days: string[]; sessionMinutes: string;
  equipment: string[]; adjustments: string[]; diet: string; allergies: string[];
  allergiesReviewed: boolean; otherAllergy: string; dislikes: string; mealsPerDay: string; cookingMinutes: string; budget: string;
}
export type OnboardingProfile = OnboardingDraft & { goal: Goal; version: 1 | 2; completedAt: string }
export const emptyOnboarding: OnboardingDraft = {
  goal: '', timeZone: 'Asia/Manila', ageRange: '', age: '', gender: '', heightCm: '', weightKg: '', targetWeightKg: '', focusAreas: ['Overall'], activity: '', experience: '',
  days: [], sessionMinutes: '', equipment: [], adjustments: [], diet: '', allergies: [],
  allergiesReviewed: false, otherAllergy: '', dislikes: '', mealsPerDay: '', cookingMinutes: '', budget: '',
}
export function validTimeZone(value: string): boolean { try { if (!value || value.length > 80) return false; new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false } }
const oneOf = (value: string, choices: readonly string[]) => choices.includes(value)
export function validateOnboarding(value: OnboardingDraft, step?: number, legacy = false): string[] {
  const errors: string[] = []
  const check = (section: number) => step === undefined || step === section
  if (check(0) && !goalOptions.some(([key]) => key === value.goal)) errors.push('Choose your main goal.')
  if (check(0) && (!value.focusAreas.length || !value.focusAreas.every(area => oneOf(area, focusOptions)) || (value.focusAreas.includes('Overall') && value.focusAreas.length > 1))) errors.push('Choose Overall or one or more specific focus areas.')
  if (check(1)) {
    if (!validTimeZone(value.timeZone)) errors.push('Choose a valid time zone.')
    if (legacy) {
      if (!oneOf(value.ageRange, ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'])) errors.push('Choose your age range.')
    } else {
      if (!/^\d{1,3}$/.test(value.age) || Number(value.age) < 1 || Number(value.age) > 120) errors.push('Enter your age in whole years, from 1 to 120.')
      if (!oneOf(value.gender, genderOptions)) errors.push('Choose your gender, or Prefer not to say.')
    }
    if (!oneOf(value.activity, ['Mostly seated', 'Lightly active', 'Moderately active', 'Very active'])) errors.push('Choose your usual activity level.')
    for (const [input, min, max, label] of [[value.heightCm, 100, 250, 'Height'], [value.weightKg, 20, 350, 'Weight'], [value.targetWeightKg, 20, 350, 'Target weight']] as const) {
      if (input !== '' && (!/^\d{1,3}(?:\.\d{1,2})?$/.test(input) || !Number.isFinite(Number(input)) || Number(input) < min || Number(input) > max)) errors.push(`${label} must be ${min}–${max}, or leave it blank.`)
    }
  }
  if (check(2)) {
    if (!oneOf(value.experience, ['Beginner', 'Intermediate', 'Advanced'])) errors.push('Choose your training experience.')
    if (value.days.length < 1 || value.days.length > 6 || !value.days.every(day => oneOf(day, days))) errors.push('Choose 1–6 training days, leaving at least one rest day.')
    if (!oneOf(value.sessionMinutes, ['15', '20', '30', '45', '60'])) errors.push('Choose a session length.')
    if (!value.equipment.length || !value.equipment.every(item => oneOf(item, equipmentOptions))) errors.push('Choose the equipment you can use, including bodyweight if you have none.')
    if (!value.adjustments.every(item => oneOf(item, adjustmentOptions))) errors.push('Choose a valid movement preference.')
  }
  if (check(3)) {
    if (!value.allergiesReviewed) errors.push('Confirm whether you have any food allergies.')
    if (!oneOf(value.diet, dietOptions)) errors.push('Choose your eating preference.')
    if (!value.allergies.every(item => oneOf(item, allergyOptions))) errors.push('Choose valid allergy options.')
    if (value.allergies.includes('Other') && !value.otherAllergy.trim()) errors.push('Describe your other food allergy.')
    if (value.otherAllergy.length > 120 || value.dislikes.length > 200) errors.push('Keep allergy notes under 120 characters and food dislikes under 200.')
    if (!oneOf(value.mealsPerDay, ['2', '3', '4', '5'])) errors.push('Choose your preferred number of meals.')
    if (!oneOf(value.cookingMinutes, ['15', '30', '45', '60'])) errors.push('Choose your available cooking time.')
    if (!oneOf(value.budget, ['Budget-friendly', 'Moderate', 'Flexible'])) errors.push('Choose your food budget preference.')
  }
  return errors
}
// Both saves and reads use this allowlist. Unknown fields never enter the profile.
export function parseOnboarding(input: unknown): OnboardingDraft | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const raw = input as Record<string, unknown>
  const draft = { ...emptyOnboarding }
  for (const key of Object.keys(emptyOnboarding) as (keyof OnboardingDraft)[]) {
    // Earlier profiles did not contain these fields. Preserve their existing answers.
    const value = raw[key] === undefined && ['age', 'gender', 'targetWeightKg', 'focusAreas', 'timeZone'].includes(key) ? emptyOnboarding[key] : raw[key]
    if (key === 'allergiesReviewed') { if (typeof value !== 'boolean') return null; draft[key] = value }
    else if (key === 'days' || key === 'equipment' || key === 'adjustments' || key === 'allergies' || key === 'focusAreas') {
      if (!Array.isArray(value) || value.length > 12 || value.some(item => typeof item !== 'string' || item.length > 80) || new Set(value).size !== value.length) return null
      // Ignore the retired preference in existing saved profiles.
      draft[key] = key === 'adjustments' ? value.filter(item => item !== 'Need professional guidance') : [...value]
    } else {
      if (typeof value !== 'string' || value.length > 200) return null
      Object.assign(draft, { [key]: value.trim() })
    }
  }
  if (!draft.allergies.includes('Other')) draft.otherAllergy = ''
  if (/^\d{1,3}$/.test(draft.age) && Number(draft.age) >= 1 && Number(draft.age) <= 120) {
    const age = Number(draft.age)
    draft.ageRange = age < 18 ? 'Under 18' : age < 25 ? '18–24' : age < 35 ? '25–34' : age < 45 ? '35–44' : age < 55 ? '45–54' : age < 65 ? '55–64' : '65+'
  }
  return draft
}
export function readCompletedOnboarding(input: unknown): OnboardingProfile | null {
  const draft = parseOnboarding(input)
  const metadata = input as Partial<OnboardingProfile> | null
  const legacy = metadata?.version === 1 && !draft?.age && !draft?.gender
  if (!draft || validateOnboarding(draft, undefined, legacy).length || (metadata?.version !== 1 && metadata?.version !== 2) || typeof metadata.completedAt !== 'string' || !Number.isFinite(Date.parse(metadata.completedAt))) return null
  return { ...draft, goal: draft.goal as Goal, version: legacy ? 1 : 2, completedAt: metadata.completedAt }
}
