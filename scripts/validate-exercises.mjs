import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { curatedExercises } from './curated-exercises.mjs'

const readJSON = async file => JSON.parse(await readFile(file, 'utf8'))
const [exercises, media, source] = await Promise.all([
  readJSON('backend/data/exercises.json'), readJSON('backend/data/exercises-media.json'), readJSON('backend/data/exercise-source.json'),
])
const fields = ['id', 'name', 'bodyPart', 'target', 'secondaryMuscles', 'equipment', 'category', 'difficulty', 'movementPattern', 'defaultTarget', 'gifUrl', 'thumbnailUrl', 'specificInstructions', 'coachTip'].sort()
const allowedParts = new Set(['back', 'cardio', 'chest', 'core', 'lower-arms', 'lower-legs', 'neck', 'shoulders', 'upper-arms', 'upper-legs', 'waist'])
const expectedGroups = { Chest: 16, Back: 16, Legs: 20, Shoulders: 14, Arms: 18, 'Core/Cardio': 16 }
assert.equal(exercises.length, 100)
assert.equal(new Set(exercises.map(item => item.id)).size, 100)
assert.equal(new Set(exercises.map(item => item.coachTip)).size, 100)
assert.deepEqual(exercises, curatedExercises, 'Rebuild the export after editing curated content')
const counts = Object.fromEntries(Object.keys(expectedGroups).map(key => [key, 0]))
const expectedAssets = new Set()
for (const item of exercises) {
  assert.deepEqual(Object.keys(item).sort(), fields, `${item.id}: exact export schema`)
  assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  assert(allowedParts.has(item.bodyPart))
  assert(['Beginner', 'Intermediate', 'Advanced'].includes(item.difficulty))
  assert(['Push', 'Pull', 'Squat', 'Hinge', 'Core', 'Cardio'].includes(item.movementPattern))
  assert(Array.isArray(item.secondaryMuscles))
  assert.equal(item.specificInstructions.length, 4)
  assert(item.specificInstructions.every(step => typeof step === 'string' && step.length > 45))
  assert(!item.specificInstructions.join(' ').toLowerCase().includes('adopt the starting position'))
  const base = `https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/${item.bodyPart}/${item.id}`
  assert.equal(item.gifUrl, `${base}.gif`)
  assert.equal(item.thumbnailUrl, `${base}.webp`)
  const resolved = media[item.id]
  assert(resolved && resolved.group in counts)
  counts[resolved.group]++
  for (const [url, signature] of [[resolved.image_url, 'WEBP'], [resolved.media_urls[0], 'GIF']]) {
    assert.match(url, /^\/exercises\/[a-z0-9-]+\.(gif|webp)$/)
    expectedAssets.add(url.split('/').pop())
    const bytes = await readFile(`frontend/public${url}`)
    assert.equal(signature === 'GIF' ? bytes.subarray(0, 3).toString() : bytes.subarray(8, 12).toString(), signature)
  }
}
assert.deepEqual(counts, expectedGroups)
assert.deepEqual(source.groups, expectedGroups)
assert.equal(source.count, 100)
assert.equal(source.media_count, 100)
for (const category of ['strength', 'cardio', 'stretching', 'plyometrics']) assert(exercises.some(item => item.category === category), `Missing ${category} options`)
assert.deepEqual(new Set(await readdir('frontend/public/exercises')), expectedAssets, 'Only curated media should be hosted')
console.log('PASS: exact 100-record schema, group balance, four exercise types, unique tips, specific steps, and 200 valid local media files')
