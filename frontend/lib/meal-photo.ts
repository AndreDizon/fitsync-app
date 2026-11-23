export async function prepareMealPhoto(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 12000000) throw new Error('Choose a JPEG, PNG or WebP meal photo under 12 MB.')
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file) } catch { throw new Error('This photo could not be read. Try a JPEG, PNG or WebP image.') }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 20000000) throw new Error('Choose a photo with no more than 20 megapixels.')
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image processing is unavailable in this browser.')
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8))
    if (!blob || blob.size > 1000000) throw new Error('This photo is too large after compression. Choose a smaller photo.')
    return new File([blob], 'meal.jpg', { type: 'image/jpeg' })
  } finally { bitmap.close() }
}
