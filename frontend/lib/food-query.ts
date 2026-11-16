import { foodDiets, matchesFoodFilters, type Food, type FoodFilters } from './nutrition'

export type FoodQuery = FoodFilters & { query: string; diet: string; sort: string }
export type FoodFacet = 'group' | 'type' | 'preparation' | 'meal' | 'diet'
const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const diets = ['vegan', 'vegetarian', 'pescatarian', 'halal']
const dietMatch = (food: Food, diet: string) => !diet || (diet === 'halal' ? food.halal === 'ingredient-compatible' : diets.includes(diet) && food[diet as 'vegan' | 'vegetarian' | 'pescatarian'])

export function queryFoodCatalog(foods: Food[], selection: FoodQuery) {
  const terms = normalize(selection.query.slice(0, 200)).split(/\s+/).filter(Boolean)
  const matches = (food: Food, except?: FoodFacet) => {
    const filters = { ...selection, ...(except ? { [except]: '' } : {}) }
    return matchesFoodFilters(food, filters) && dietMatch(food, except === 'diet' ? '' : selection.diet) && terms.every(term => normalize([food.name, ...food.aliases, food.category, food.state, ...Object.values(food.classifications).flat(), ...foodDiets(food)].join(' ')).includes(term))
  }
  const facets = {
    group: [...new Set(foods.flatMap(food => food.classifications.groups))].sort(),
    type: [...new Set(foods.flatMap(food => food.classifications.foodTypes))].sort(),
    preparation: [...new Set(foods.flatMap(food => food.classifications.preparation))].sort(),
    meal: [...new Set(foods.flatMap(food => food.classifications.mealUses))].sort(), diet: diets,
  }
  const facetCounts = Object.fromEntries((Object.keys(facets) as FoodFacet[]).map(key => [key, Object.fromEntries(facets[key].map(value => [value, foods.filter(food => matches(food, key) && (key === 'diet' ? dietMatch(food, value) : food.classifications[key === 'group' ? 'groups' : key === 'type' ? 'foodTypes' : key === 'meal' ? 'mealUses' : 'preparation'].includes(value))).length]))])) as Record<FoodFacet, Record<string, number>>
  const data = foods.filter(food => matches(food))
  const rank = (food: Food) => normalize(food.name) === terms.join(' ') ? 100 : terms.filter(term => normalize(food.name).includes(term)).length
  data.sort((a, b) => {
    if (selection.sort === 'protein' || selection.sort === 'energy') {
      const key = selection.sort === 'protein' ? 'proteinG' : 'energyKcal', av = a.nutrients[key], bv = b.nutrients[key]
      if (av === null || bv === null) { if (av !== bv) return av === null ? 1 : -1 }
      else if (av !== bv) return selection.sort === 'protein' ? bv - av : av - bv
    }
    if (selection.sort === 'prep' && a.prepMinutes !== b.prepMinutes) return a.prepMinutes - b.prepMinutes
    if (selection.sort === 'relevance' && terms.length && rank(a) !== rank(b)) return rank(b) - rank(a)
    return (selection.sort === 'name-desc' ? -1 : 1) * a.name.localeCompare(b.name, 'en')
  })
  return { data, facetCounts, facets, groupTotal: foods.filter(food => matches(food, 'group')).length }
}
