import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

const media = JSON.parse(await readFile('backend/data/exercises-media.json', 'utf8'))
assert.equal(Object.keys(media).length, 100)
for (const [id, item] of Object.entries(media)) {
  const still = sharp(`frontend/public${item.image_url}`)
  const gif = sharp(`frontend/public${item.media_urls[0]}`, { page: 0, pages: 1 })
  const [metadata, source] = await Promise.all([still.metadata(), gif.metadata()])
  assert.equal(metadata.pages ?? 1, 1, `${id}: animated thumbnail`)
  assert.equal(metadata.width, source.width, `${id}: reduced thumbnail width`)
  assert.equal(metadata.height, source.height, `${id}: reduced thumbnail height`)
  assert.deepEqual(await still.removeAlpha().raw().toBuffer(), await gif.removeAlpha().raw().toBuffer(), `${id}: first frame changed`)
}
const foods = JSON.parse(await readFile('backend/data/foods.json', 'utf8'))
const offline = JSON.parse(await readFile('frontend/public/offline/foods.json', 'utf8'))
assert.deepEqual(offline, foods)
const manifest = JSON.parse(await readFile('frontend/public/offline/food-manifest.json', 'utf8'))
assert.equal(manifest.count, 100)
assert.deepEqual(manifest.resources, ['/offline/foods.json'])
assert.equal(manifest.totalBytes, (await readFile('frontend/public/offline/foods.json')).byteLength)
console.log('PASS: 100 static lossless thumbnails match the GIF first frames at native resolution; offline food seed matches the full catalog.')
