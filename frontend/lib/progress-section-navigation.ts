import type { MouseEvent } from 'react'

/** Keep in-page progress navigation smooth without changing the active app route. */
export function scrollToProgressSection(event: MouseEvent<HTMLElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
  if (!link || !event.currentTarget.contains(link)) return
  const target = document.getElementById(link.hash.slice(1))
  if (!target) return
  event.preventDefault()
  if (target instanceof HTMLDetailsElement) target.open = true
  target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}
