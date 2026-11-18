'use client'

import { useEffect } from 'react'
import '@/app/modal-layout.css'

/** Own the page lock once, even when dialogs overlap or replace one another. */
export function ModalScrollManager() {
  useEffect(() => {
    const root = document.documentElement
    let locked = false, scrollX = 0, scrollY = 0, touchX = 0, touchY = 0
    const modals = () => Array.from(document.querySelectorAll<HTMLElement>('dialog[open], [role="dialog"][aria-modal="true"]')).filter(element => element.getClientRects().length > 0)
    function update() {
      const open = modals().length > 0
      if (open === locked) return
      locked = open
      if (open) {
        scrollX = window.scrollX; scrollY = window.scrollY
        root.style.setProperty('--modal-page-top', -scrollY + 'px')
        root.style.setProperty('--modal-page-left', -scrollX + 'px')
        root.setAttribute('data-modal-locked', '')
      } else {
        root.removeAttribute('data-modal-locked')
        root.style.removeProperty('--modal-page-top'); root.style.removeProperty('--modal-page-left')
        window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
      }
    }
    function containScroll(event: Event, delta: number) {
      if (!locked || !delta) return
      const target = event.target instanceof Element ? event.target : null
      const modal = modals().find(element => target && element.contains(target))
      if (modal && target) {
        let current: Element | null = target
        while (current && modal.contains(current)) {
          const style = getComputedStyle(current)
          if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight && (delta < 0 ? current.scrollTop > 0 : current.scrollTop + current.clientHeight < current.scrollHeight - 1)) return
          if (current === modal) break
          current = current.parentElement
        }
      }
      event.preventDefault()
    }
    const wheel = (event: WheelEvent) => containScroll(event, event.deltaY)
    const start = (event: TouchEvent) => { touchX = event.touches[0]?.clientX || 0; touchY = event.touches[0]?.clientY || 0 }
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 1) return
      const point = event.touches[0], delta = touchY - point.clientY, horizontal = touchX - point.clientX
      touchX = point.clientX; touchY = point.clientY
      if (Math.abs(delta) >= Math.abs(horizontal)) containScroll(event, delta)
    }
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'aria-modal', 'hidden', 'class'] })
    document.addEventListener('wheel', wheel, { passive: false })
    document.addEventListener('touchstart', start, { passive: true })
    document.addEventListener('touchmove', move, { passive: false })
    update()
    return () => {
      observer.disconnect(); document.removeEventListener('wheel', wheel); document.removeEventListener('touchstart', start); document.removeEventListener('touchmove', move)
      if (locked) { root.removeAttribute('data-modal-locked'); root.style.removeProperty('--modal-page-top'); root.style.removeProperty('--modal-page-left'); window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' }) }
    }
  }, [])
  return null
}
