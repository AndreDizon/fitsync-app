'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { KeyRound, LogOut, ShieldCheck, Trash2, X } from 'lucide-react'
import { eraseAccountData, finishAccountReset, requestAccountRecovery, signOutEverywhere, type AccountActionState } from '@/app/auth/account-actions'
import { clearNotificationCopies } from '@/lib/notifications'
import { clearProgressCopies } from '@/lib/progress'
import { clearDailyPlanCopies } from '@/lib/daily-plans'
import { clearOfflinePlaylists } from '@/lib/playlists'
import { usePlanAccount } from '@/lib/playlist-account'
import { pendingPlanEdits } from '@/lib/plan-signout'
import { ActionNotice } from './action-notice'
import '@/app/account-security.css'

async function clearPrivateCopies() {
  clearNotificationCopies(); clearProgressCopies(); clearDailyPlanCopies()
  await clearOfflinePlaylists()
}

export function AccountSecuritySettings() {
  const owner = usePlanAccount()
  const [operation, setOperation] = useState<'reset' | 'delete' | null>(null)
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [destination, setDestination] = useState('')
  async function recover() {
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await requestAccountRecovery()
      if (result.error) setError(result.error)
      else setMessage(result.message || 'Check your account email for a recovery code.')
    } catch { setError('Could not request recovery. Please try again.') }
    finally { setBusy(false) }
  }
  async function allSessions() {
    setBusy(true); setError('')
    try {
      if (await pendingPlanEdits(owner)) { setError('You have unsynced changes. Sync your records before signing out everywhere.'); return }
      const result = await signOutEverywhere()
      if (result.error) { setError(result.error); return }
      await clearPrivateCopies()
      window.location.assign('/login')
    } catch { setError('Could not finish signing out. Please try again.') }
    finally { setBusy(false) }
  }
  return <section className="st-card st-security" id="settings-security" aria-labelledby="security-title">
    <header className="st-card-heading"><span className="st-icon"><ShieldCheck size={21}/></span><div><h2 id="security-title">Sign-in &amp; account security</h2><p>Recover access, manage sessions or start fresh.</p></div></header>
    <div className="st-card-body security-rows">
      <div className="security-row"><KeyRound size={20}/><div><h3>Password recovery</h3><p>Send a code to your verified account email. Enter it in FitSync, then choose a new password in the same tab.</p><button className="security-button" disabled={!owner || busy} onClick={recover}>{busy ? 'Please wait...' : 'Send recovery code'}</button></div></div>
      <div className="security-row"><LogOut size={20}/><div><h3>Sign out on all devices</h3><p>End your sessions across devices. Unsynced changes on this device will be cleared. Sync your records first.</p><button className="security-button secondary" disabled={!owner || busy} onClick={allSessions}>Sign out everywhere</button></div></div>
      <div className="security-row danger-row"><Trash2 size={20}/><div><h3>Delete my data</h3><p>Permanently remove plans, playlists, progress, photos, achievements and community activity. Keep your account and sign-in details, then complete onboarding again.</p><button className="security-button danger" disabled={!owner || busy} onClick={() => setOperation('reset')}>Delete data &amp; start again</button></div></div>
      <div className="security-row danger-row"><Trash2 size={20}/><div><h3>Delete my account</h3><p>Permanently remove your FitSync account and its data, then sign out. This cannot be undone.</p><button className="security-button danger" disabled={!owner || busy} onClick={() => setOperation('delete')}>Delete account</button></div></div>
      {!owner && <p className="security-note">Account security controls are available after signing in to a real account.</p>}
      {error && <p className="security-error" role="alert">{error}</p>}
    </div>
    {operation && <EraseDialog operation={operation} onClose={() => setOperation(null)} onComplete={async () => {
      await clearPrivateCopies()
      const deleting = operation === 'delete'
      setOperation(null); setDestination(deleting ? '/login' : '/onboarding')
      setMessage(deleting ? 'Your FitSync account and its data have been deleted.' : 'Your saved data has been deleted. Your account is kept. Continue to onboarding to set your preferences again.')
    }}/>}
    {message && <ActionNotice message={message} onClose={() => {
      if (!destination) { setMessage(''); return }
      void (async () => {
        try { if (destination === '/onboarding') await finishAccountReset(); window.location.assign(destination) }
        catch { window.location.assign('/login') }
      })()
    }}/>}
  </section>
}

function EraseDialog({ operation, onClose, onComplete }: { operation: 'reset' | 'delete'; onClose: () => void; onComplete: () => Promise<void> }) {
  const [state, action, pending] = useActionState<AccountActionState, FormData>(eraseAccountData, {})
  const dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null)
  const handled = useRef(false)
  const [cleanupError, setCleanupError] = useState('')
  const deleting = operation === 'delete', phrase = deleting ? 'DELETE ACCOUNT' : 'DELETE DATA'
  useEffect(() => { dialog.current?.showModal(); cancel.current?.focus() }, [])
  useEffect(() => {
    if (!state.completed || handled.current) return
    handled.current = true
    onComplete().catch(() => { setCleanupError('Your account action completed, but device cleanup was interrupted. Close this tab and sign in again.'); handled.current = false })
  }, [state.completed, onComplete])
  return createPortal(<dialog ref={dialog} className="security-dialog" aria-labelledby="erase-title" onCancel={event => { event.preventDefault(); if (!pending) onClose() }}>
    <button className="security-close" aria-label="Close account confirmation" disabled={pending} onClick={onClose}><X size={20}/></button>
    <span className="security-dialog-icon"><Trash2 size={24}/></span>
    <h2 id="erase-title">{deleting ? 'Delete your account?' : 'Start again with a clean account?'}</h2>
    <p>{deleting ? 'Your account, uploaded images and all saved records will be permanently deleted.' : 'All saved records, photos and community activity will be permanently deleted. Your username, email and password will stay.'}</p>
    <p className="security-note">This cannot be undone. Export any records you want to keep first.</p>
    <form action={action} aria-busy={pending}>
      <fieldset disabled={pending || !!state.completed}>
        <input type="hidden" name="operation" value={operation}/>
        <label htmlFor="erase-password">Current FitSync password</label>
        <input id="erase-password" name="password" type="password" autoComplete="current-password" required maxLength={128} placeholder="Enter your FitSync password"/>
        <p className="security-note">If you use Google and have not set a FitSync password, use email recovery first.</p>
        <label htmlFor="erase-confirmation">Type {phrase} to confirm</label>
        <input id="erase-confirmation" name="confirmation" autoComplete="off" spellCheck={false} required pattern={phrase} placeholder={phrase}/>
        <div className="security-dialog-actions"><button type="button" ref={cancel} className="security-button" onClick={onClose}>Keep my {deleting ? 'account' : 'data'}</button><button className="security-button danger" type="submit">{pending ? 'Deleting...' : deleting ? 'Delete account permanently' : 'Delete all my data'}</button></div>
      </fieldset>
      {(state.error || cleanupError) && <p className="security-error" role="alert">{state.error || cleanupError}</p>}
    </form>
  </dialog>, document.body)
}
