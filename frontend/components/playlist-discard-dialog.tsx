'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FilePenLine, X } from 'lucide-react'
import '@/app/playlist-discard-dialog.css'

export function PlaylistDiscardDialog({ message, onDecision }: { message: string; onDecision: (discard: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), keep = useRef<HTMLButtonElement>(null), id = useId()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.showModal(); keep.current?.focus();
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [])
  return createPortal(<dialog ref={dialog} className="playlist-discard-dialog" aria-labelledby={id + '-title'} aria-describedby={id + '-message'} onCancel={event => { event.preventDefault(); onDecision(false) }}>
    <button type="button" className="playlist-discard-close" aria-label="Keep editing and close" onClick={() => onDecision(false)}><X size={20}/></button>
    <span className="playlist-discard-icon" aria-hidden="true"><FilePenLine size={28}/></span>
    <h2 id={id + '-title'}>Leave without saving?</h2>
    <p id={id + '-message'}>{message}</p>
    <div className="playlist-discard-actions"><button type="button" className="playlist-discard-confirm" onClick={() => onDecision(true)}>Discard changes</button><button ref={keep} type="button" className="playlist-discard-keep" onClick={() => onDecision(false)}>Keep editing</button></div>
  </dialog>, document.body)
}
