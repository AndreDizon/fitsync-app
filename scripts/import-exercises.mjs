import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { curatedExercises, curatedGroups } from './curated-exercises.mjs'

const revision = 'f6d16e977fbee3c04295311c44cb8374ca8ff182'
const source = 'https://github.com/JahelCuadrado/ExerciseGymGifsDB'
const base = `https://raw.githubusercontent.com/JahelCuadrado/ExerciseGymGifsDB/${revision}`
const checkout = process.argv[2] ? path.resolve(process.argv[2]) : null
const load = async file => {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(file) || file.includes('..')) throw new Error('Invalid source path')
  if (checkout) return readFile(path.join(checkout, file))
  const response = await fetch(`${base}/${file}`, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Source download failed: ${file} (HTTP ${response.status})`)
  return Buffer.from(await response.arrayBuffer())
}
const catalog = JSON.parse((await load('api/en/exercises.json')).toString())
const output = path.resolve('backend/data')
const assets = path.resolve('frontend/public/exercises')
await Promise.all([mkdir(output, { recursive: true }), mkdir(assets, { recursive: true })])
const groupById = new Map(Object.entries(curatedGroups).flatMap(([group, items]) => items.map(item => [item.id, group])))
const manifest = {}
let cursor = 0
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < curatedExercises.length) {
    const exercise = curatedExercises[cursor++]
    const matches = catalog.exercises.filter(item => item.slug === exercise.id)
    if (matches.length !== 1) throw new Error(`Expected one exact media match for ${exercise.id}, got ${matches.length}`)
    const item = matches[0]
    const thumbFile = item.file.replace(/\.gif$/, '.thumb.webp')
    const [gif, thumb] = await Promise.all([load(item.file), load(thumbFile)])
    if (gif.subarray(0, 3).toString() !== 'GIF' || thumb.subarray(8, 12).toString() !== 'WEBP') throw new Error(`Invalid source media: ${item.id}`)
    await Promise.all([writeFile(path.join(assets, `${exercise.id}.gif`), gif), writeFile(path.join(assets, `${exercise.id}.webp`), thumb)])
    manifest[exercise.id] = {
      group: groupById.get(exercise.id), source_id: item.id,
      image_url: `/exercises/${exercise.id}.webp`, media_urls: [`/exercises/${exercise.id}.gif`],
      source_media_url: `${base}/${item.file}`,
    }
  }
}))
const orderedManifest = Object.fromEntries(curatedExercises.map(item => [item.id, manifest[item.id]]))
await writeFile(path.join(output, 'exercises.json'), JSON.stringify(curatedExercises, null, 2) + '\n')
await writeFile(path.join(output, 'exercises-media.json'), JSON.stringify(orderedManifest, null, 2) + '\n')
await writeFile(path.join(output, 'exercise-source.json'), JSON.stringify({
  source, revision, language: 'en', count: curatedExercises.length, media_count: curatedExercises.length,
  groups: Object.fromEntries(Object.entries(curatedGroups).map(([key, items]) => [key, items.length])),
  instructions_author: 'FitSync curated guidance',
  export_media_convention: 'Requested bodyPart/id CDN template; use the verified media manifest for display because upstream folders differ.',
}, null, 2) + '\n')
console.log(JSON.stringify({ records: curatedExercises.length, hostedMedia: Object.keys(manifest).length, groups: Object.fromEntries(Object.entries(curatedGroups).map(([key, items]) => [key, items.length])) }))
await import('./seed-offline-exercises.mjs')
