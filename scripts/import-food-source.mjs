// Maintainer-only import: node scripts/import-food-source.mjs <extracted USDA CSV directory>
// Normal seeding/builds use the checked-in subset and never download data.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { curatedFoods } from './curated-foods.mjs'
import { expansionRows } from './food-expansion.mjs'

const directory = process.argv[2]
if (!directory) throw new Error('Supply the extracted USDA SR Legacy CSV directory.')
function fields(line) {
  const values = []; let text = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (quoted && line[i + 1] === '"') { text += '"'; i++ } else quoted = !quoted }
    else if (c === ',' && !quoted) { values.push(text); text = '' } else text += c
  }
  values.push(text); return values
}
async function rows(file) {
  const lines = (await readFile(join(directory, file), 'utf8')).trim().split(/\r?\n/)
  const keys = fields(lines.shift())
  return lines.map(line => Object.fromEntries(fields(line).map((value, i) => [keys[i], value])))
}
const old = JSON.parse(await readFile('backend/data/foods-source.json', 'utf8'))
const ids = new Set([...curatedFoods, ...expansionRows].map(food => food.fdcId))
const foodRows = (await rows('food.csv')).filter(food => ids.has(food.fdc_id))
const portions = (await rows('food_portion.csv')).filter(food => ids.has(food.fdc_id))
const nutrientIds = new Set(['1008', '1003', '1004', '1005', '1079', '2000', '1258', '1093', '1087', '1089', '1092', '1114', '1162'])
const nutrients = new Map()
const nutrientLines = (await readFile(join(directory, 'food_nutrient.csv'), 'utf8')).trim().split(/\r?\n/)
const keys = fields(nutrientLines.shift())
for (const line of nutrientLines) {
  const values = fields(line)
  const row = Object.fromEntries(values.map((value, i) => [keys[i], value]))
  if (ids.has(row.fdc_id) && nutrientIds.has(row.nutrient_id) && row.amount !== '' && Number.isFinite(Number(row.amount))) {
    if (!nutrients.has(row.fdc_id)) nutrients.set(row.fdc_id, {})
    nutrients.get(row.fdc_id)[row.nutrient_id] = Number(row.amount)
  }
}
if (foodRows.length !== 100) throw new Error(`Expected 100 unique source records; found ${foodRows.length}`)
const records = foodRows.map(food => ({ ...food, portions: portions.filter(portion => portion.fdc_id === food.fdc_id).map(portion => ({ id: portion.id, amount: Number(portion.amount), label: portion.modifier, grams: Number(portion.gram_weight) })).filter(portion => portion.grams > 0 && Number.isFinite(portion.grams) && portion.label), nutrients: nutrients.get(food.fdc_id) ?? {} }))
await writeFile('backend/data/foods-source.json', JSON.stringify({ ...old, records }, null, 2) + '\n')
console.log(`Imported ${records.length} selected USDA source records with original nutrients and household weights.`)
