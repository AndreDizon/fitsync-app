import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { PGlite } from '@electric-sql/pglite'

const foods = JSON.parse(await readFile('backend/data/foods.json', 'utf8'))
const legacy = JSON.parse(await readFile('backend/data/foods-legacy.json', 'utf8'))
const md = await readFile('PHILIPPINE_FOOD_CANDIDATES.md', 'utf8')
const headings = [...md.matchAll(/^## \d+\. (.+)$/gm)].map(match => match[1])
assert.equal(foods.length, 100)
assert.deepEqual(foods.map(f => f.name), headings, 'Approved names and Tagalog labels retained in order')
for (const food of foods) {
  assert.equal(food.sampleDishes.length, 5, food.name)
  assert.equal(new Set(food.sampleDishes).size, 5, food.name)
  assert(food.sampleDishes.every(d => typeof d === 'string' && d.trim().length > 3))
  assert(food.referenceNote && food.source.description)
  const old = legacy.find(f => f.id === food.id)
  if (old) {
    assert.equal(old.source.fdcId, food.source.fdcId, 'Do not reuse an old ID for another food state')
    assert.deepEqual(old.nutrients, food.nutrients, 'Saved ID nutrient values remain unchanged')
  }
}
for (const [id, expected] of [['ph-glutinous-rice', 'glutinous'], ['ph-soybeans', 'Soybeans'], ['ph-crab', 'crab'], ['ph-squid', 'squid']]) {
  assert(foods.find(f => f.id === id).source.description.toLowerCase().includes(expected.toLowerCase()), 'Source identity: ' + id)
}
const out = await build({ stdin: { contents: "export * from './shared/daily-plans';export * from './shared/playlists';export {foodById,foods} from './frontend/lib/nutrition';export {queryFoodCatalog} from './frontend/lib/food-query';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false })
const api = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
assert.equal(api.foodCatalog.length, 100, 'New selections use exactly 100 active foods')
for (const food of legacy) {
  const item = api.newPlaylistItem('nutrition', food.id)
  assert(api.parsePlaylist({ id: crypto.randomUUID(), kind: 'nutrition', duration: 'day', selectedDay: 0, name: 'Existing meal', description: '', items: [item] }).data, food.id)
  assert.deepEqual(api.foodById(food.id).nutrients, food.nutrients, food.id)
  const totals = api.foodTotals([item])
  assert.equal(totals.energy, food.nutrients.energyKcal ?? 0, 'Historical totals: ' + food.id)
}
const selection = { query: 'adobong pusit', group: '', type: '', preparation: '', meal: '', excludedAllergens: [], diet: '', sort: 'relevance' }
assert(api.queryFoodCatalog(api.foods, selection).data.some(f => f.name === 'Squid (Pusit)'), 'Dish-name search finds the ingredient')
const db = new PGlite()
try {
  await db.exec('create table plan_catalog_refs(kind text not null,id text not null,primary key(kind,id));')
  for (const food of legacy) await db.query("insert into plan_catalog_refs values('nutrition',$1)", [food.id])
  const sql = await readFile('backend/migrations/20261128_philippine_food_catalog.sql', 'utf8')
  await db.exec(sql); await db.exec(sql)
  const ids = new Set((await db.query("select id from plan_catalog_refs where kind='nutrition'")).rows.map(r => r.id))
  for (const food of [...foods, ...legacy]) assert(ids.has(food.id), 'SQL allows new and existing entries: ' + food.id)
} finally { await db.close() }
console.log('PASS Philippine library: 100 approved names, 500 unique-per-food dish examples, exact source identities, stable historical IDs/nutrients/totals, dish search and idempotent SQL allowlist.')
