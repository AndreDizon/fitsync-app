import seed from '../../backend/data/foods.json'
import type { OnboardingProfile } from '../../shared/onboarding'

export type FoodNutrients = { energyKcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; fiberG: number | null; sugarsG: number | null; saturatedFatG: number | null; sodiumMg: number | null; calciumMg: number | null; ironMg: number | null; potassiumMg: number | null; vitaminDUg: number | null; vitaminCMg: number | null }
export type Food = {
  id: string; name: string; aliases: string[]; category: string; state: string; description: string;
  classifications: { groups: string[]; foodTypes: string[]; preparation: string[]; mealUses: string[] };
  defaultPortionId: string; portions: { id: string; label: string; grams: number; source: string }[];
  allergens: string[]; vegan: boolean; vegetarian: boolean; pescatarian: boolean; halal: string;
  prepMinutes: number; prepTimeSource: string; budget: string; benefits: { title: string; text: string; source: string | null }[];
  preparation: string[]; measureNote: string; pairing: string[]; productNote?: string; crossContact: string;
  nutrients: FoodNutrients; source: { provider: string; dataset: string; fdcId: number; description: string; publishedAt: string; reviewedAt: string; url: string };
}
export const foods = seed as Food[]
export const mealSlots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
export type MealSlot = typeof mealSlots[number]
export type FoodPlanEntry = { id: string; foodId: string; grams: number; slot: MealSlot; day: number }
export const foodById = (id: string) => foods.find(food => food.id === id)
export function nutrientsFor(food: Food, grams: number): FoodNutrients {
  if (!Number.isFinite(grams) || grams < 1 || grams > 2000) throw new Error('Choose an edible portion between 1 and 2,000 g.')
  return Object.fromEntries(Object.entries(food.nutrients).map(([key, value]) => [key, value === null ? null : value * (grams / 100)])) as FoodNutrients
}
export function foodPreferenceCheck(food: Food, profile: OnboardingProfile | null) {
  const conflicts = food.allergens.filter(allergen => profile?.allergies.includes(allergen))
  const diet = profile?.diet
  const dietConflict = diet === 'Halal' && food.halal === 'not-compatible' || diet === 'Vegan' && !food.vegan || diet === 'Vegetarian' && !food.vegetarian || diet === 'Pescatarian' && !food.pescatarian
  const needsReview = !!profile?.allergies.includes('Other') || diet === 'Halal' && food.halal === 'requires-verification'
  return { conflicts, dietConflict, needsReview, matches: !conflicts.length && !dietConflict && !needsReview }
}
export function nutritionTotals(entries: FoodPlanEntry[]) {
  const totals = { energyKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  for (const entry of entries) {
    const food = foodById(entry.foodId)
    if (!food) continue
    const nutrients = nutrientsFor(food, entry.grams)
    for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += nutrients[key] ?? 0
  }
  return totals
}
export const formatNutrient = (value: number | null, decimals = 1) => value === null ? 'Not reported' : value.toLocaleString('en-US', { maximumFractionDigits: decimals })

export const foodGroups = ['Grains', 'Protein foods', 'Legumes', 'Fruits', 'Vegetables', 'Dairy', 'Nuts & seeds', 'Oils & fats', 'Roots & tubers']
export const foodDiets = (food: Food) => [food.vegan && 'Vegan ingredients', food.vegetarian && 'Vegetarian ingredients', food.pescatarian && 'Pescatarian ingredients'].filter(Boolean) as string[]
export type FoodFilters = { group: string; type: string; preparation: string; meal: string; excludedAllergens: string[] }
export function matchesFoodFilters(food: Food, filters: FoodFilters) {
  const c = food.classifications
  return (!filters.group || c.groups.includes(filters.group)) && (!filters.type || c.foodTypes.includes(filters.type)) && (!filters.preparation || c.preparation.includes(filters.preparation)) && (!filters.meal || c.mealUses.includes(filters.meal)) && !food.allergens.some(allergen => filters.excludedAllergens.includes(allergen))
}
