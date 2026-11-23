export type NutrientRange = [number, number]
export type MealEstimate = {
  items: { id: string; name: string; state: string; grams: NutrientRange; source: string }[]
  totals: { energyKcal: NutrientRange | null; proteinG: NutrientRange | null; carbsG: NutrientRange | null; fatG: NutrientRange | null; fiberG: NutrientRange | null }
  partial: boolean
  benefits: { title: string; text: string; source: string }[]
}
export function isMealEstimate(value: unknown): value is MealEstimate {
  if (!value || typeof value !== 'object') return false
  const data = value as MealEstimate
  const text = (value: unknown, limit: number) => typeof value === 'string' && value.length <= limit
  const range = (value: unknown) => Array.isArray(value) && value.length === 2 && value.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) && value[0] <= value[1]
  return typeof data.partial === 'boolean' && Array.isArray(data.items) && data.items.length <= 15 && data.items.every(item => item && text(item.id, 100) && text(item.name, 160) && text(item.state, 100) && range(item.grams) && typeof item.source === 'string' && item.source.startsWith('https://')) && !!data.totals && ['energyKcal', 'proteinG', 'carbsG', 'fatG', 'fiberG'].every(key => { const value = data.totals[key as keyof MealEstimate['totals']]; return value === null || range(value) }) && Array.isArray(data.benefits) && data.benefits.length <= 3 && data.benefits.every(item => item && text(item.title, 160) && text(item.text, 1200) && typeof item.source === 'string' && item.source.startsWith('https://'))
}
