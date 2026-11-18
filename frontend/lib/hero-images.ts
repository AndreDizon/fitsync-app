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

export function heroImage(name: keyof typeof heroWidths) {
  const prefix = '/mascot/optimized/' + name
  return {
    src: prefix + '-' + heroWidths[name] + '.webp',
    srcSet: prefix + '-480.webp 480w, ' + prefix + '-' + heroWidths[name] + '.webp ' + heroWidths[name] + 'w',
    sizes: '(max-width: 600px) 40vw, (max-width: 1100px) 36vw, 480px',
    decoding: 'async' as const,
  }
}
