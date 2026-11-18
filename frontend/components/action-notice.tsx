'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CircleCheck, X } from 'lucide-react'
import '@/app/action-notice.css'

/** Acknowledged feedback for completed saves, posts and deletions. */
export function ActionNotice({ message, onClose }: { message: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), close = useRef<HTMLButtonElement>(null), id = useId()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    // Let a submitting editor close before moving focus into this confirmation.
    const frame = requestAnimationFrame(() => { dialog.current?.showModal(); close.current?.focus(); document.body.style.overflow = 'hidden' })
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [])
  return createPortal(<dialog ref={dialog} className="action-notice" aria-labelledby={id + '-title'} aria-describedby={id + '-message'} onCancel={event => { event.preventDefault(); onClose() }}>
    <button type="button" className="action-notice-close" aria-label="Close confirmation" onClick={onClose}><X size={20}/></button>
    <span className="action-notice-icon" aria-hidden="true"><CircleCheck size={30}/></span>
    <h2 id={id + '-title'}>Update complete</h2>
    <p id={id + '-message'}>{message}</p>
    <button ref={close} type="button" className="action-notice-done" onClick={onClose}>Done</button>
  </dialog>, document.body)
}
