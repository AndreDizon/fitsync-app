import { readdir, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
const directory = 'frontend/public/mascot/achievements'
const output = path.join(directory, 'optimized')
await mkdir(output, { recursive: true })
let originalBytes = 0, optimizedBytes = 0
const files = (await readdir(directory)).filter(file => file.endsWith('.webp'))
for (const file of files) {
  const source = path.join(directory, file), target = path.join(output, file)
  originalBytes += (await stat(source)).size
  await sharp(source).resize(320, 320, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78, alphaQuality: 85, effort: 6 }).toFile(target)
  optimizedBytes += (await stat(target)).size
}
console.log(`${files.length} achievement mascots: ${originalBytes} -> ${optimizedBytes} bytes (${Math.round((1 - optimizedBytes / originalBytes) * 100)}% smaller)`)