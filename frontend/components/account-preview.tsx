'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { UserRound, X } from 'lucide-react'
import { updateAccountUsername } from '@/app/auth/profile-actions'
import { validUsername } from '../../shared/account-security'
import '@/app/account-preview.css'

export function AccountPreview({ username, email, onSaved, onClose }: {
  username: string; email: string;
  onSaved: (username: string) => void; onClose: () => void;
}) {
  const dialog=useRef<HTMLDialogElement>(null)
  const [name,setName]=useState(username),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const unchanged=name.trim()===username
  const close=()=>{if(busy)return;dialog.current?.close();onClose()}
  useEffect(()=>{dialog.current?.showModal()},[])
  return createPortal(<dialog className="account-preview" ref={dialog} aria-labelledby="account-preview-title" aria-describedby="account-preview-description" onCancel={event=>{event.preventDefault();close()}} onClick={event=>{if(event.target===event.currentTarget)close()}}>
    <header><UserRound size={22} aria-hidden="true"/><div><h2 id="account-preview-title">Your account</h2><p id="account-preview-description">Review your details. You can edit your username here.</p></div><button type="button" className="account-preview-close" aria-label="Close account preview" disabled={busy} onClick={close}><X size={20}/></button></header>
    <form aria-label="Account details" onSubmit={async event=>{
      event.preventDefault();setError('');setMessage('')
      if(!validUsername(name.trim())){setError('Use 3–30 letters, numbers, periods, underscores or hyphens. Start with a letter or number.');return}
      if(unchanged||busy)return
      setBusy(true)
      try{const result=await updateAccountUsername(name);if(result.error)setError(result.error);else if(result.username){setName(result.username);onSaved(result.username);setMessage('Username saved.')}}
      catch{setError('Could not save your username. Please try again.')}
      finally{setBusy(false)}
    }}>
      <div className="account-preview-body">
        <label htmlFor="account-username">Username</label>
        <input id="account-username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={30} value={name} disabled={busy} aria-invalid={!!error} aria-describedby="account-username-help account-preview-error" onChange={event=>{setName(event.target.value);setError('');setMessage('')}}/>
        <p id="account-username-help" className="account-preview-hint">3–30 characters. Letters, numbers, periods, underscores and hyphens.</p>
        <label htmlFor="account-email">Email address <span>Read-only</span></label>
        <input id="account-email" type="email" value={email} readOnly/>
        <p id="account-preview-error" className="account-preview-error" role="alert">{error}</p>
        {message&&<p className="account-preview-success" role="status">{message}</p>}
      </div>
      <footer><button type="button" disabled={busy} onClick={close}>Close</button><button type="submit" className="account-preview-save" disabled={busy||unchanged}>{busy?'Saving…':'Save username'}</button></footer>
    </form>
  </dialog>,document.body)
}
