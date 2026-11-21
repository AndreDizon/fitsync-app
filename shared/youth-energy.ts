// National Academies, Dietary Reference Intakes for Energy (2023), Table 5-15.
// https://www.nationalacademies.org/read/26818/chapter/7
// Age in years, height in cm, current weight in kg; growth is included.
export const youthActivityOptions = ['Inactive', 'Low active', 'Active', 'Very active'] as const
export type YouthActivity = typeof youthActivityOptions[number]
export const youthActivityDescriptions: Record<YouthActivity, string> = {
  Inactive: 'Mostly sitting, with only the movement needed for everyday activities and little exercise.',
  'Low active': 'Everyday activities plus some walking, active travel or recreational movement.',
  Active: 'A day with substantial walking or movement, plus regular exercise or sport.',
  'Very active': 'A highly active day that includes substantial movement and vigorous sport or other demanding activity.',
}
// Entries are [constant, age coefficient, height coefficient, weight coefficient].
const coefficients: Record<YouthActivity, { male: number[]; female: number[] }> = {
  Inactive: { male: [-447.51, 3.68, 13.01, 13.15], female: [55.59, -22.25, 8.43, 17.07] },
  'Low active': { male: [19.12, 3.68, 8.62, 20.28], female: [-297.54, -22.25, 12.77, 14.73] },
  Active: { male: [-388.19, 3.68, 12.66, 20.46], female: [-189.55, -22.25, 11.74, 18.34] },
  'Very active': { male: [-671.75, 3.68, 15.38, 23.25], female: [-709.59, -22.25, 18.22, 14.25] },
}
export function youthEnergyRange(profile: { age: string; heightCm: string; weightKg: string; youthActivity?: string }): [number, number] | null {
  const age = Number(profile.age), height = Number(profile.heightCm), weight = Number(profile.weightKg)
  if (!Number.isInteger(age) || age < 13 || age >= 18 || !Number.isFinite(height) || height < 100 || height > 250 || !Number.isFinite(weight) || weight < 20 || weight > 350 || !youthActivityOptions.includes(profile.youthActivity as YouthActivity)) return null
  const model = coefficients[profile.youthActivity as YouthActivity]
  const evaluate = (c: number[], growth: number) => c[0] + c[1] * age + c[2] * height + c[3] * weight + growth
  const results = [evaluate(model.male, age < 14 ? 25 : 20), evaluate(model.female, age < 14 ? 30 : 20)]
  // Keep out-of-scope profiles outside automated menu planning. These bounds
  // are an app review threshold, not a clinically validated eligibility test.
  if (results.some(value => !Number.isFinite(value) || value < 1200 || value > 4500)) return null
  return results.map(Math.round).sort((a,b) => a-b) as [number, number]
}
