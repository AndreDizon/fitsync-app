import { mkdir, stat } from 'node:fs/promises'
import sharp from 'sharp'
const directory = 'frontend/public/mascot/'
const names = ['fox-greeting', 'hero-fox-head', 'hero-dumbbell', 'hero-apple', 'fox-plan-workout', 'fox-plan-nutrition', 'social-connected-earth', 'fox-social-phone', 'hero-social-phone', 'hero-progress-document']
await mkdir(directory + 'optimized', { recursive: true })
let before = 0, after = 0
for (const name of names) {
  const source = directory + name + '.png', metadata = await sharp(source).metadata()
  before += (await stat(source)).size
  for (const width of [480, Math.min(960, metadata.width)]) {
    const target = directory + 'optimized/' + name + '-' + width + '.webp'
    await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 95, effort: 6 }).toFile(target)
    const bytes = (await stat(target)).size
    if (width > 480) after += bytes
    console.log(name, width, bytes)
  }
}
console.log(JSON.stringify({ originalBytes: before, largeVariantBytes: after, savings: Math.round((1 - after / before) * 100) + '%' }))