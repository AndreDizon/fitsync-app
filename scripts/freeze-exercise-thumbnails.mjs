import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const media = JSON.parse(await readFile('backend/data/exercises-media.json', 'utf8'))
for (const item of Object.values(media)) {
  // Decode only frame zero at its native resolution; never resize or blur.
  const still = await sharp(`frontend/public${item.media_urls[0]}`, { page: 0, pages: 1 }).webp({ lossless: true }).toBuffer()
  await writeFile(`frontend/public${item.image_url}`, still)
}
console.log(`Saved ${Object.keys(media).length} non-animated, full-resolution exercise thumbnails.`)
