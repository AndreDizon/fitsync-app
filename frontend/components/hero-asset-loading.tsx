'use client'

import { useEffect } from 'react'
import { heroImage, type HeroImageName } from '@/lib/hero-images'

type HeroPage = 'home' | 'plans' | 'social' | 'progress'
function artwork(page: HeroPage, compact: boolean, mode: 'workout' | 'nutrition'): HeroImageName[] {
  if (page === 'home') return [compact ? 'hero-fox-head' : 'fox-greeting']
  if (page === 'plans') return [mode === 'workout' ? 'fox-plan-workout' : 'fox-plan-nutrition']
  if (page === 'social') return compact ? ['social-connected-earth'] : ['social-connected-earth', 'fox-social-phone']
  return [compact ? 'hero-progress-document' : 'fox-progress']
}

/** Responsive hints fetch only the artwork displayed at the current breakpoint. */
export function HeroImagePreloads({ page, mode = 'workout' }: { page: HeroPage; mode?: 'workout' | 'nutrition' }) {
  return <>{[true, false].flatMap(compact => artwork(page, compact, mode).map(name => {
    const asset = heroImage(name)
    return <link key={name + compact} rel="preload" as="image" href={asset.src} imageSrcSet={asset.srcSet} imageSizes={asset.sizes} media={compact ? '(width < 1025px)' : '(width >= 1025px)'} fetchPriority="high" />
  }))}</>
}

/** Warm public artwork after initial load, one responsive image at a time. */
export function HeroAssetWarmer() {
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType || '')) return
    let stopped = false
    let timer: number | undefined
    let idle: number | undefined
    const warm = async () => {
      const compact = window.matchMedia('(width < 1025px)').matches
      const names = new Set<HeroImageName>([
        ...artwork('home', compact, 'workout'), ...artwork('plans', compact, 'workout'),
        ...artwork('plans', compact, 'nutrition'), ...artwork('social', compact, 'workout'),
        ...artwork('progress', compact, 'workout'),
      ])
      for (const name of names) {
        if (stopped) break
        if (document.hidden) break
        const asset = heroImage(name)
        await new Promise<void>(resolve => {
          const image = new Image()
          image.fetchPriority = 'low'
          image.decoding = 'async'
          image.onload = image.onerror = () => resolve()
          if (asset.sizes) image.sizes = asset.sizes
          if (asset.srcSet) image.srcset = asset.srcSet
          image.src = asset.src
        })
      }
    }
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(() => { void warm() }, { timeout: 3000 })
      else timer = window.setTimeout(() => { void warm() }, 1200)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => { stopped = true; window.removeEventListener('load', schedule); if (timer !== undefined) window.clearTimeout(timer); if (idle !== undefined) window.cancelIdleCallback(idle) }
  }, [])
  return null
}
