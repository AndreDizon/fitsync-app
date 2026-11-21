// Educational references, separate from catalog measurements and planning rules.
// No reference listed here implies endorsement or professional review of FitSync.
import { days, type OnboardingDraft } from '../../shared/onboarding'

// FitSync planning heuristic, not a guideline-prescribed duration or fitness assessment.
// Guidelines address weekly activity and training volume, not minutes by body size.
export function suggestSessionMinutes(profile: Pick<OnboardingDraft, 'age' | 'experience' | 'goal' | 'days'>) {
  if (!/^\d+$/.test(profile.age) || Number(profile.age) < 13 || Number(profile.age) > 120 || !['Beginner', 'Intermediate', 'Advanced'].includes(profile.experience)) return null
  const frequency = new Set(profile.days.filter(day => (days as readonly string[]).includes(day))).size
  if (Number(profile.age) < 18) return {
    minutes: '30',
    reason: 'Start with a compact, technique-focused session. For strength work, use qualified supervision and plan 2–3 sessions on nonconsecutive days; other selected days can include enjoyable activity and easier movement.',
    youth: true,
  }
  let minutes = profile.experience === 'Beginner' ? 30 : profile.experience === 'Intermediate' ? 45 : 60
  let reason = profile.experience === 'Beginner'
    ? 'A compact session leaves room to practise technique and build a routine.'
    : profile.experience === 'Intermediate'
      ? 'This leaves room for familiar exercises, rest between sets and gradual progression.'
      : 'This leaves more room for training volume and rest between demanding sets.'
  if (profile.goal === 'mobility') {
    minutes = 30
    reason = 'For your mobility goal, start with a compact session focused on comfortable, controlled movement.'
  } else if (frequency >= 4) {
    minutes = Math.min(minutes, 45)
    reason += ` With ${frequency} training days, spread the work across the week rather than making every session long.`
  }
  return { minutes: String(minutes), reason, youth: false }
}

export const healthSources = {
  activity: { name: 'WHO · Physical activity', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' },
  strength: { name: 'ACSM · Resistance training guidance', url: 'https://acsm.org/resistance-training-guidelines-update-2026/' },
  youthStrength: { name: 'AAP · Youth strength training', url: 'https://www.healthychildren.org/English/healthy-living/sports/Pages/Strength-Training.aspx' },
  youthActivity: { name: 'CDC · Activity for children and teens', url: 'https://www.cdc.gov/physical-activity-basics/guidelines/children.html' },
  diet: { name: 'WHO · Healthy diet', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
  foodData: { name: 'USDA · FoodData Central documentation', url: 'https://fdc.nal.usda.gov/data-documentation/' },
  energy: { name: 'Mifflin–St Jeor · Original study', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
  youthEnergy: { name: 'National Academies · 2023 DRI energy equations', url: 'https://www.nationalacademies.org/read/26818/chapter/7' },
  youthNutrition: { name: 'NIDDK · Nutrition for teenagers', url: 'https://www.niddk.nih.gov/health-information/weight-management/take-charge-health-guide-teenagers' },
  macroRanges: { name: 'Health Canada · Macronutrient reference ranges', url: 'https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients.html' },
  intensity: { name: 'CDC · Measuring activity intensity', url: 'https://www.cdc.gov/physical-activity-basics/measuring/index.html' },
  flexibility: { name: 'American Heart Association · Stretching', url: 'https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/flexibility-exercise-stretching' },
  plyometrics: { name: 'HSS · Learning plyometrics', url: 'https://www.hss.edu/health-library/move-better/plyometrics-workouts-for-beginner' },
} as const

export const activityDescriptions: Record<string, string> = {
  'Mostly seated': 'Most of the day sitting, with little walking or physical work.',
  'Lightly active': 'Mostly sitting, with some walking, errands or light household tasks.',
  'Moderately active': 'Regular walking and standing through the day, with some physical tasks.',
  'Very active': 'Much of the day spent moving or doing physically demanding work.',
}
export const experienceDescriptions: Record<string, string> = {
  Beginner: 'New to structured training, returning after a break, or still learning exercise technique.',
  Intermediate: 'You train regularly and can perform familiar exercises with controlled technique.',
  Advanced: 'You have sustained structured training experience and can manage exercise technique, load and recovery.',
}
export const eatingPreferenceDescriptions: Record<string, string> = {
  'No preference': 'Includes all food types that pass your listed allergy exclusions and other filters.',
  Vegetarian: 'Excludes meat and fish by ingredient tags; eggs and dairy may still be included.',
  Vegan: 'Uses foods tagged as having no animal ingredients. This filter alone does not ensure a nutritionally complete diet.',
  Pescatarian: 'Includes fish and seafood, eggs and dairy; excludes other meat by ingredient tags.',
  Halal: 'Filters by ingredient compatibility. Verify the product and preparation separately; FitSync does not certify foods as halal.',
}

export const movementExplanations: Record<string, string> = {
  Push: 'A pushing movement. Use the listed target and secondary muscles to understand its role in your routine.',
  Pull: 'A pulling movement. Balance it with other movement patterns across your training week.',
  Squat: 'A knee-and-hip bending pattern. Choose a comfortable range and maintain control throughout the movement.',
  Hinge: 'A hip-dominant pattern. Practise the movement with a manageable load before adding weight.',
  Core: 'Trunk training. Control your position and breathing rather than rushing the repetitions or hold.',
  Cardio: 'Conditioning work. Duration alone does not describe intensity; use your breathing and effort as additional guides.',
}

export function exercisePractice(category: string) {
  if (category.toLowerCase() === 'cardio') return {
    start: 'Start at an easy pace. At moderate effort you can generally talk, but not sing; slow down when you cannot maintain your intended effort.',
    progress: 'Build duration or intensity gradually, changing one at a time. Record what you actually completed.',
  }
  if (category.toLowerCase() === 'stretching') return {
    start: 'Move slowly into a comfortable stretch. Avoid bouncing or forcing the joint into a painful position.',
    progress: 'Use comfortable control and range as your guide. Longer or deeper is not automatically better.',
  }
  if (category.toLowerCase() === 'plyometrics') return {
    start: 'Practise a controlled takeoff and quiet, balanced landing before increasing speed or height. Use an easier low-impact variation if landing control is difficult.',
    progress: 'Keep the quality of each repetition consistent. Stop the set when landing control deteriorates; more repetitions are not automatically better.',
  }
  return {
    start: 'Begin with a manageable load or easier variation. Practise controlled repetitions before increasing resistance; the listed sets and reps are an editable template.',
    progress: 'When the planned repetitions feel consistently manageable with controlled technique, consider a small increase in load or repetitions. Log your results before changing the next session.',
  }
}

export function nutrientCoverage(nutrients: Record<string, number | null>) {
  const values = Object.values(nutrients)
  return { reported: values.filter(value => value !== null && Number.isFinite(value)).length, total: values.length }
}
