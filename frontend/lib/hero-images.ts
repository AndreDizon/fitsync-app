import { heroAssetVersions } from './hero-asset-versions'

export function heroAssetUrl(file: string) {
  const version = heroAssetVersions[file]
  return (file === 'fox-progress.png' ? '/mascot/' : '/mascot/optimized/') + file + (version ? '?v=' + version : '')
}

/** Transparent hero artwork, with retina-sized desktop and smaller mobile sources. */
const heroWidths = {
  'fox-greeting': 960,
  'hero-fox-head': 768,
  'hero-dumbbell': 768,
  'hero-apple': 768,
  'fox-plan-workout': 960,
  'fox-plan-nutrition': 960,
  'social-connected-earth': 960,
  'fox-social-phone': 960,
  'hero-social-phone': 768,
  'hero-progress-document': 768,
} as const

export type HeroImageName = keyof typeof heroWidths | 'fox-progress'
export function heroImage(name: HeroImageName) {
  if (name === 'fox-progress') return { src: heroAssetUrl('fox-progress.png'), decoding: 'async' as const }
  return {
    src: heroAssetUrl(name + '-' + heroWidths[name] + '.webp'),
    srcSet: heroAssetUrl(name + '-480.webp') + ' 480w, ' + heroAssetUrl(name + '-' + heroWidths[name] + '.webp') + ' ' + heroWidths[name] + 'w',
    sizes: '(max-width: 600px) 40vw, (max-width: 1100px) 36vw, 480px',
    decoding: 'async' as const,
  }
}
