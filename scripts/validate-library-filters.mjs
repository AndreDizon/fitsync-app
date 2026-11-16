import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

async function moduleFrom(path) {
  const bundle = await build({ entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'esm' })
  return import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
}
const { queryFoodCatalog } = await moduleFrom('frontend/lib/food-query.ts')
const { queryExercises } = await moduleFrom('shared/exercise-query.ts')
const foods = JSON.parse(await readFile('backend/data/foods.json', 'utf8'))
const { data: exercises } = JSON.parse(await readFile('frontend/public/offline/exercises.json', 'utf8'))
const base = { query: '', group: '', diet: '', type: '', preparation: '', meal: '', excludedAllergens: [], sort: 'relevance' }
const query = (patch = {}) => queryFoodCatalog(foods, { ...base, ...patch })
const originalOrder = foods.map(food => food.id)
assert.equal(query().data.length, 100)
assert.deepEqual(query({ query: 'RÍCE' }).data.map(food => food.id), query({ query: 'rice' }).data.map(food => food.id))
assert(query({ query: 'rice cooked' }).data.length > 0)
const vegan = foods.filter(food => food.vegan)
const result = query({ diet: 'vegan', excludedAllergens: ['Soy'] })
assert(result.data.every(food => food.vegan && !food.allergens.includes('Soy')))
for (const group of result.facets.group) {
  const expected = vegan.filter(food => !food.allergens.includes('Soy') && food.classifications.groups.includes(group)).length
  assert.equal(result.facetCounts.group[group], expected, 'Food facet counts respect other selections')
  const selected = query({ diet: 'vegan', excludedAllergens: ['Soy'], group })
  assert.equal(selected.data.length, expected)
  assert.deepEqual(selected.facetCounts.group, result.facetCounts.group, 'Own-group selection does not zero out other groups')
}
for (const key of ['type', 'preparation', 'meal']) {
  const field = key === 'type' ? 'foodTypes' : key === 'meal' ? 'mealUses' : key
  for (const value of result.facets[key]) assert.equal(result.facetCounts[key][value], result.data.filter(food => food.classifications[field].includes(value)).length)
}
assert(query({ diet: 'halal' }).data.every(food => food.halal === 'ingredient-compatible'))
assert.equal(query({ query: 'no-such-food-xyz' }).data.length, 0)
const protein = query({ sort: 'protein' }).data.map(food => food.nutrients.proteinG).filter(value => value !== null)
assert(protein.every((value, index) => !index || value <= protein[index - 1]))
const energy = query({ sort: 'energy' }).data.map(food => food.nutrients.energyKcal).filter(value => value !== null)
assert(energy.every((value, index) => !index || value >= energy[index - 1]))
const prep = query({ sort: 'prep' }).data.map(food => food.prepMinutes)
assert(prep.every((value, index) => !index || value >= prep[index - 1]))
assert.deepEqual(foods.map(food => food.id), originalOrder, 'Sorting does not mutate the source catalog')
const sample = structuredClone(foods[0]); sample.id = 'missing-nutrients'; sample.nutrients.proteinG = null; sample.nutrients.energyKcal = null
for (const sort of ['protein', 'energy']) assert.equal(queryFoodCatalog([...foods, sample], { ...base, sort }).data.at(-1).id, sample.id)

const exerciseQuery = (entries = {}) => queryExercises(exercises, new URLSearchParams({ pageSize: '100', ...entries }))
assert.equal(exerciseQuery().total, 100)
assert(exerciseQuery({ q: 'DB row' }).data.every(item => item.equipment.includes('dumbbell')))
assert(exerciseQuery({ q: 'DB row' }).total > 0)
const equipment = [...new Set(exercises.map(item => item.equipment))].slice(0, 2)
const params = new URLSearchParams({ group: exercises[0].group, pageSize: '100' }); equipment.forEach(value => params.append('equipment', value))
const combined = queryExercises(exercises, params)
assert.equal(combined.total, exercises.filter(item => item.group === exercises[0].group && equipment.includes(item.equipment)).length, 'Equipment OR combines with focus AND')
const synthetic = { ...exercises[0], target_muscle: 'unique muscle target' }
assert.equal(queryExercises([synthetic], new URLSearchParams({ q: 'unique muscle' })).total, 1)
const paged = queryExercises(exercises, new URLSearchParams({ page: '999', pageSize: '24' }))
assert.equal(paged.page, 5); assert.equal(paged.data.length, 4)
assert.equal(exerciseQuery({ q: 'no-such-exercise-xyz' }).total, 0)
console.log('PASS: food search/facets/diets/exclusions/sort/nulls; exercise aliases/equipment OR/focus AND/primary muscle/pagination; catalogs remain unchanged')
