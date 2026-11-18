import { mkdir, stat } from 'node:fs/promises'
import sharp from 'sharp'
const base = 'frontend/public/mascot/'
await mkdir(base + 'optimized', { recursive: true })
for (const [name, widths] of [['fox-auth', [320, 768]], ['fox-logo', [192]], ['fox-recovery', [480]], ['fox-collection', [480]]]) {
  const source = base + name + '.png'
  for (const width of widths) {
    const output = base + 'optimized/' + name + '-' + width + '.webp'
    await sharp(source).resize(width, width, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(output)
    console.log(name, width, (await stat(source)).size, '->', (await stat(output)).size, 'bytes')
  }
}