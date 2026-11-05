import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { estimateExercise, estimateMethod } from './exercise-estimates.mjs'


process.chdir(fileURLToPath(new URL('../', import.meta.url)))
await mkdir('frontend/public/offline', { recursive: true })

const readJSON = async file => JSON.parse(await readFile(file, 'utf8'))
const [curated, media, source] = await Promise.all([
  readJSON('backend/data/exercises.json'), readJSON('backend/data/exercises-media.json'), readJSON('backend/data/exercise-source.json'),
])
const estimates = Object.fromEntries(curated.map(item => [item.id, estimateExercise(item)]))
await writeFile('backend/data/exercises-estimates.json', JSON.stringify({ method: estimateMethod, exercises: estimates }, null, 2) + '\n')
const data = curated.map(item => ({ ...item, ...media[item.id], estimates: estimates[item.id], target_muscle: item.target, body_part: item.bodyPart, secondary_muscles: item.secondaryMuscles, instructions: item.specificInstructions }))
if (data.length !== 100 || new Set(data.map(item => item.id)).size !== 100) throw new Error('Offline seed must contain 100 unique exercises')
const payload = JSON.stringify({ data, source, estimateMethod })
const resources = ['/offline/exercises.json', '/mascot/fox-logo.png', ...data.flatMap(item => [item.image_url, ...item.media_urls])]
const hash = createHash('sha256').update(payload)
for (const file of ['shared/exercise-query.ts', 'frontend/public/exercise-library-sw.js', 'frontend/components/exercise-library.tsx', 'frontend/components/offline-library-status.tsx', 'frontend/app/exercise-library.css', 'frontend/app/layout.tsx']) hash.update(await readFile(file))
let totalBytes = Buffer.byteLength(payload)
for (const url of resources.slice(1)) {
  const bytes = await readFile(`frontend/public${url}`)
  hash.update(url).update(bytes)
  totalBytes += bytes.byteLength
}
const version = hash.digest('hex').slice(0, 20)
await mkdir('frontend/public/offline', { recursive: true })
await writeFile('frontend/public/offline/exercises.json', payload + '\n')
await writeFile('frontend/public/offline/exercise-manifest.json', JSON.stringify({ version, count: data.length, totalBytes, resources }, null, 2) + '\n')
console.log(`Offline seed: ${data.length} exercises, ${resources.length} resources, ${(totalBytes / 1024 / 1024).toFixed(1)} MB (${version})`)
