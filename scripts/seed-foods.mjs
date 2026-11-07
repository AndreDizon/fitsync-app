import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { curatedFoods } from './curated-foods.mjs'
import { expandedFoodMetadata } from './expanded-food-metadata.mjs'
import { foodClassifications } from './food-classifications.mjs'

process.chdir(fileURLToPath(new URL('../', import.meta.url)))
const source = JSON.parse(await readFile('backend/data/foods-source.json', 'utf8'))
const fields = { energyKcal: '1008', proteinG: '1003', carbsG: '1005', fatG: '1004', fiberG: '1079', sugarsG: '2000', saturatedFatG: '1258', sodiumMg: '1093', calciumMg: '1087', ironMg: '1089', potassiumMg: '1092', vitaminDUg: '1114', vitaminCMg: '1162' }
const foods = [...curatedFoods, ...expandedFoodMetadata(source)].map(meta => {
  const classifications = meta.classifications ?? foodClassifications[meta.id]
  if (!classifications) throw new Error(`Missing classifications for ${meta.id}`)
  const record = source.records.find(record => record.fdc_id === meta.fdcId)
  if (!record) throw new Error(`Missing USDA record for ${meta.id}`)
  const portions = [{ id: 'grams', label: 'Grams (g)', grams: 1, source: 'mass unit' }, { id: '100g', label: '100 g edible portion', grams: 100, source: 'reference mass' }, ...meta.portionIds.map(id => {
    const portion = record.portions.find(portion => portion.id === id)
    if (!portion) throw new Error(`Missing source portion ${id}`)
    return { id, label: `${portion.amount} ${portion.label}`, grams: portion.grams, source: 'USDA household measure' }
  })]
  return { ...meta, category: meta.category === 'Protein' ? 'Protein foods' : meta.category, classifications, basisGrams: 100, nutrients: Object.fromEntries(Object.entries(fields).map(([key, nutrientId]) => [key, record.nutrients[nutrientId] ?? null])), portions, crossContact: 'unknown', prepTimeSource: 'FitSync planning estimate; varies by method and equipment', source: { provider: source.provider, dataset: source.dataset, fdcId: Number(meta.fdcId), description: record.description, publishedAt: record.publication_date, reviewedAt: source.reviewedAt, url: `https://fdc.nal.usda.gov/food-details/${meta.fdcId}/nutrients` } }
})
if (foods.length !== 100 || new Set(foods.map(food => food.id)).size !== 100) throw new Error('The food seed must contain exactly 100 foods')
await writeFile('backend/data/foods.json', JSON.stringify(foods, null, 2) + '\n')
const payload = JSON.stringify(foods) + '\n'
const version = createHash('sha256').update(payload).digest('hex').slice(0, 20)
await mkdir('frontend/public/offline', { recursive: true })
await writeFile('frontend/public/offline/foods.json', payload)
await writeFile('frontend/public/offline/food-manifest.json', JSON.stringify({ version, count: foods.length, totalBytes: Buffer.byteLength(payload), resources: ['/offline/foods.json'] }, null, 2) + '\n')
console.log(`Food library seeded: ${foods.length} foods with source-backed nutrients and serving weights`)
