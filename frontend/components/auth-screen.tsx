'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkle, Sparkles, Star, Plus, Mail, UserRound } from 'lucide-react'
import { Wordmark } from '@/components/wordmark'
import { passwordLimits, type AuthField } from '@/lib/auth/validation'
import { login, signup, forgotPassword, resetPassword, googleSignIn, type AuthState } from '@/app/auth/actions'

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset'
const actions = { login, signup, forgot: forgotPassword, reset: resetPassword }
const copy = {
  login: { eyebrow: 'YOUR NEXT CHAPTER', title: 'Welcome back.', subtitle: 'A little stronger starts with showing up.', submit: 'Sign in' },
  signup: { eyebrow: 'ONE SMALL STEP', title: 'Find your rhythm.', subtitle: 'Create your account. Make room for a healthier you.', submit: 'Create account' },
  forgot: { eyebrow: 'LET’S GET YOU BACK', title: 'Forgot your password?', subtitle: 'We’ll send a reset link to your email address.', submit: 'Send reset link' },
  reset: { eyebrow: 'A FRESH START', title: 'New password.', subtitle: 'Choose a long, unique password for your account.', submit: 'Save password' },
}

export function AuthScreen({ mode, configured, testerAvailable = false, notice }: { mode: AuthMode; configured: boolean; testerAvailable?: boolean; notice?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(actions[mode], {})
  const [googleState, googleAction, googlePending] = useActionState(googleSignIn, {})
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const confirmationInput = useRef<HTMLInputElement>(null)
  const errorBox = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (state.error) errorBox.current?.focus() }, [state])
  useEffect(() => { confirmationInput.current?.setCustomValidity(confirmation && confirmation !== password ? 'Passwords must match.' : '') }, [password, confirmation])
  const fieldId = (field: AuthField) => 'auth-' + mode + '-' + field
  const errorId = (field: AuthField) => state.fieldErrors?.[field] ? fieldId(field) + '-error' : undefined
  const fieldError = (field: AuthField) => state.fieldErrors?.[field] ? <p className="auth-field-error" id={errorId(field)}>{state.fieldErrors[field]}</p> : null
  const content = copy[mode]
  const busy = pending || googlePending
  const newPassword = mode === 'signup' || mode === 'reset'
  return <main className={`auth-page auth-mode-${mode}`}>
    <div className="auth-shell">

      <section className="auth-form-panel" aria-labelledby="auth-title">
        <div className="auth-phone-browser" role="note" aria-label={`Current page: ${mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Sign up' : mode === 'forgot' ? 'Password recovery' : 'Reset password'}`}><span className="auth-window-dots" aria-hidden="true"><i /><i /><i /></span><span className="auth-browser-navigation">{mode !== 'login' ? <Link href={mode === 'reset' ? '/forgot-password' : '/login'} aria-label={mode === 'reset' ? 'Back to password recovery' : 'Back to sign in'}><ArrowLeft size={14} /></Link> : <span aria-hidden="true">‹</span>}<span aria-hidden="true">›</span></span><span className="auth-browser-address"><LockKeyhole size={10} aria-hidden="true" /><span>fitsync / {mode === 'signup' ? 'signup' : mode === 'login' ? 'login' : mode === 'forgot' ? 'recovery' : 'reset-password'}</span></span><span className="auth-browser-plus" aria-hidden="true">+</span></div>
        <div className="auth-form-inner"><Link href="/login" className="auth-brand" aria-label="FitSync sign in"><img src="/mascot/fox-logo.png" width="42" height="42" alt="" /><Wordmark /></Link>{mode !== 'login' && <Link className="auth-back" href={mode === 'reset' ? '/forgot-password' : '/login'}><ArrowLeft size={16} />{mode === 'reset' ? 'Back to password recovery' : 'Back to sign in'}</Link>}<div className="auth-phone-mascot"><span className="auth-phone-glow" /><Sparkles className="auth-phone-spark" aria-hidden="true" /><img src="/mascot/fox-auth.png" width="1024" height="1536" alt="Cheerful FitSync fox holding an encouraging sign" /></div><span className="auth-form-eyebrow">{content.eyebrow}</span><h1 id="auth-title">{content.title}</h1><p className="auth-subtitle">{content.subtitle}</p>
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          {!configured && <p className="auth-notice" role="status">Account sign-in is unavailable right now. Please try again later.</p>}
          <form action={action} className="auth-fields" aria-busy={busy} aria-label={mode === 'login' ? 'Email sign in' : mode === 'signup' ? 'Create an account' : mode === 'forgot' ? 'Request password reset' : 'Set a new password'}>
            <fieldset disabled={busy || !configured}>
              {mode === 'signup' && <div className="auth-field"><label htmlFor={fieldId('name')}>Full name</label><span className="auth-input-wrap"><UserRound size={17} aria-hidden="true" /><input id={fieldId('name')} name="name" type="text" autoComplete="name" required minLength={2} maxLength={60} placeholder="e.g. Jamie Davis" value={name} onChange={event => setName(event.target.value)} aria-invalid={!!state.fieldErrors?.name} aria-describedby={errorId('name')} /></span>{fieldError('name')}</div>}
              {mode !== 'reset' && <div className="auth-field"><label htmlFor={fieldId('email')}>Email address</label><span className="auth-input-wrap"><Mail size={17} aria-hidden="true" /><input id={fieldId('email')} name="email" type="email" autoComplete={mode === 'login' ? 'username' : 'email'} inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={254} placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} aria-invalid={!!state.fieldErrors?.email} aria-describedby={errorId('email')} /></span>{fieldError('email')}</div>}
              {mode !== 'forgot' && <div className="auth-field"><div className="auth-label-row"><label htmlFor={fieldId('password')}>{newPassword ? 'Create password' : 'Password'}</label>{mode === 'login' && <Link href="/forgot-password">Forgot password?</Link>}</div><span className="auth-password-wrap auth-input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input id={fieldId('password')} name="password" type={showPassword ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} minLength={newPassword ? passwordLimits.min : 1} maxLength={passwordLimits.max} required placeholder={newPassword ? 'At least ' + passwordLimits.min + ' characters' : 'Enter your password'} value={password} onChange={event => setPassword(event.target.value)} aria-invalid={!!state.fieldErrors?.password} aria-describedby={[newPassword ? 'password-help' : '', errorId('password')].filter(Boolean).join(' ') || undefined} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} aria-controls={fieldId('password')}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>{fieldError('password')}</div>}
              {newPassword && <><p id="password-help" className="auth-password-help">Use 12–128 characters. A unique passphrase works well; spaces are welcome.</p><div className="auth-field"><label htmlFor={fieldId('confirmPassword')}>Confirm password</label><span className="auth-input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input ref={confirmationInput} id={fieldId('confirmPassword')} name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Re-enter your password" required minLength={passwordLimits.min} maxLength={passwordLimits.max} value={confirmation} onChange={event => setConfirmation(event.target.value)} aria-invalid={!!state.fieldErrors?.confirmPassword} aria-describedby={errorId('confirmPassword')} /></span>{fieldError('confirmPassword')}</div></>}
              <button className="auth-submit" type="submit">{pending ? 'Please wait…' : content.submit}<ArrowRight size={17} /></button>
            </fieldset>
          </form>
          {state.error && <p ref={errorBox} className="auth-error" role="alert" tabIndex={-1}>{state.error}</p>}
          {state.message && <p className="auth-success" role="status">{state.message}</p>}
          {(mode === 'login' || mode === 'signup') && <><div className="auth-divider"><span>or</span></div><form action={googleAction} className="auth-google-form" aria-label="Google sign in"><button type="submit" className="auth-google" disabled={busy || !configured}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h6a5.1 5.1 0 0 1-2.2 3.3V20h3.5c2.1-2 3.3-4.7 3.3-7.8Z"/><path fill="#34A853" d="M12 23c3 0 5.6-1 7.3-2.7l-3.5-2.9c-1 .6-2.2 1-3.8 1a6.5 6.5 0 0 1-6.1-4.5H2.3v2.8A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.9 13.9a6.7 6.7 0 0 1 0-3.8V7.3H2.3a11 11 0 0 0 0 9.4Z"/><path fill="#EA4335" d="M12 5.6c1.7 0 3.1.6 4.3 1.7l3.2-3.2A10.5 10.5 0 0 0 12 1a11 11 0 0 0-9.7 6.3l3.6 2.8A6.5 6.5 0 0 1 12 5.6Z"/></svg>{googlePending ? 'Connecting…' : 'Continue with Google'}</button></form>{googleState.error && <p className="auth-error auth-google-error" role="alert">{googleState.error}</p>}</>}
          {testerAvailable && mode === 'login' && <details className="auth-local-access"><summary>Local tester access</summary><p>Device-only preview. Use a regular account for database-backed plans.</p><form action={action} className="auth-fields auth-tester-fields" aria-label="Local tester sign in"><fieldset disabled={busy}><div className="auth-field"><label htmlFor="auth-tester-email">Tester username</label><input id="auth-tester-email" name="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required placeholder="Tester username" maxLength={254} /></div><div className="auth-field"><label htmlFor="auth-tester-password">Tester password</label><input id="auth-tester-password" name="password" type="password" autoComplete="current-password" required placeholder="Tester password" maxLength={128} /></div><button className="auth-submit" type="submit">Open local preview</button></fieldset></form></details>}
          <p className="auth-switch">{mode === 'login' ? <>New to FitSync? <Link href="/signup">Create an account</Link></> : mode === 'signup' ? <>Already have an account? <Link href="/login">Sign in</Link></> : <Link href="/login">Back to sign in</Link>}</p>
          <div className="auth-security-note"><ShieldCheck size={16} /><span>Your progress starts with a private account.</span></div>
          {(mode === 'login' || mode === 'signup') && <p className="auth-provider-note"><LockKeyhole size={12} />Google sign-in never shares your Google password with FitSync.</p>}
        </div>
      </section>
      <aside className="auth-story"><div className="auth-browser-bar" aria-hidden="true"><span className="auth-window-dots"><i /><i /><i /></span><span className="auth-browser-navigation"><span>‹</span><span>›</span></span><span className="auth-browser-address"><LockKeyhole size={10} /><span>fitsync / {mode === 'signup' ? 'signup' : mode === 'login' ? 'login' : 'recovery'}</span></span><span className="auth-browser-plus">+</span></div>

        <div className="auth-story-copy"><span className="auth-kicker"><Sparkles size={14} /> MOVE. FUEL. FEEL GOOD.</span><h2>Big energy.<br />Small beginnings.</h2><p>Build your momentum, one good habit at a time.</p></div>
        <div className="auth-fox-stage"><div className="auth-fox-orbit" /><span className="auth-mascot-spark auth-mascot-spark-1" aria-hidden="true"><Sparkle /></span><span className="auth-mascot-spark auth-mascot-spark-2" aria-hidden="true"><Star /></span><span className="auth-mascot-spark auth-mascot-spark-3" aria-hidden="true"><Sparkles /></span><span className="auth-mascot-spark auth-mascot-spark-4" aria-hidden="true"><Plus /></span><span className="auth-mascot-spark auth-mascot-spark-5" aria-hidden="true"><span /></span><img src="/mascot/fox-auth.png" width="1024" height="1536" alt="Cheerful FitSync fox holding an encouraging sign" fetchPriority="high" /></div>
        <div className="auth-story-footer"><span>Movement</span><i /><span>Nutrition</span><i /><span>Recovery</span></div>
      </aside>
    </div>
  </main>
}
