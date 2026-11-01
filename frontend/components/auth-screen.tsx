'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkle, Sparkles, Star, Plus } from 'lucide-react'
import { Wordmark } from '@/components/wordmark'
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
  const content = copy[mode]
  const busy = pending || googlePending
  const newPassword = mode === 'signup' || mode === 'reset'
  return <main className={`auth-page auth-mode-${mode}`}>
    <div className="auth-shell">

      <section className="auth-form-panel" aria-labelledby="auth-title">
        <div className="auth-phone-browser" role="note" aria-label={`Current page: ${mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Sign up' : mode === 'forgot' ? 'Password recovery' : 'Reset password'}`}><span className="auth-window-dots" aria-hidden="true"><i /><i /><i /></span><span className="auth-browser-navigation">{mode !== 'login' ? <Link href={mode === 'reset' ? '/forgot-password' : '/login'} aria-label={mode === 'reset' ? 'Back to password recovery' : 'Back to sign in'}><ArrowLeft size={14} /></Link> : <span aria-hidden="true">‹</span>}<span aria-hidden="true">›</span></span><span className="auth-browser-address"><LockKeyhole size={10} aria-hidden="true" /><span>fitsync / {mode === 'signup' ? 'signup' : mode === 'login' ? 'login' : mode === 'forgot' ? 'recovery' : 'reset-password'}</span></span><span className="auth-browser-plus" aria-hidden="true">+</span></div>
        <div className="auth-form-inner"><Link href="/login" className="auth-brand" aria-label="FitSync sign in"><img src="/mascot/fox-logo.png" width="42" height="42" alt="" /><Wordmark /></Link>{mode !== 'login' && <Link className="auth-back" href={mode === 'reset' ? '/forgot-password' : '/login'}><ArrowLeft size={16} />{mode === 'reset' ? 'Back to password recovery' : 'Back to sign in'}</Link>}<div className="auth-phone-mascot"><span className="auth-phone-glow" /><Sparkles className="auth-phone-spark" aria-hidden="true" /><img src="/mascot/fox-auth.png" width="1024" height="1536" alt="Cheerful FitSync fox holding an encouraging sign" /></div><span className="auth-form-eyebrow">{content.eyebrow}</span><h1 id="auth-title">{content.title}</h1><p className="auth-subtitle">{content.subtitle}</p>
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          {testerAvailable && <p className="auth-notice auth-tester-notice" role="status">Local tester access is enabled. Sign in with your seeded tester account.</p>}
          {!configured && !testerAvailable && <p className="auth-notice" role="status">Sign-in is temporarily unavailable. Please check back soon.</p>}
          {(mode === 'login' || mode === 'signup') && <><form action={googleAction}><button className="auth-google" disabled={busy || !configured}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h6a5.1 5.1 0 0 1-2.2 3.3V20h3.5c2.1-2 3.3-4.7 3.3-7.8Z"/><path fill="#34A853" d="M12 23c3 0 5.6-1 7.3-2.7l-3.5-2.9c-1 .6-2.2 1-3.8 1a6.5 6.5 0 0 1-6.1-4.5H2.3v2.8A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.9 13.9a6.7 6.7 0 0 1 0-3.8V7.3H2.3a11 11 0 0 0 0 9.4Z"/><path fill="#EA4335" d="M12 5.6c1.7 0 3.1.6 4.3 1.7l3.2-3.2A10.5 10.5 0 0 0 12 1a11 11 0 0 0-9.7 6.3l3.6 2.8A6.5 6.5 0 0 1 12 5.6Z"/></svg>{googlePending ? 'Connecting…' : 'Continue with Google'}</button></form><div className="auth-divider"><span className="auth-divider-desktop">or continue with email</span><span className="auth-divider-phone">or continue with</span></div></>}
          <form action={action} className="auth-fields" aria-busy={busy}>
            <fieldset disabled={busy || (!configured && !testerAvailable)}>
              {mode === 'signup' && <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={60} placeholder="Your name" /></label>}
              {mode !== 'reset' && <label>{testerAvailable ? 'Email or username' : 'Email address'}<input name="email" type={testerAvailable ? 'text' : 'email'} autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder={testerAvailable ? 'admin or you@example.com' : 'you@example.com'} /></label>}
              {mode !== 'forgot' && <label><span className="auth-label-row">{newPassword ? 'Create password' : 'Password'}{mode === 'login' && <Link href="/forgot-password">Forgot password?</Link>}</span><span className="auth-password-wrap"><input name="password" aria-label={newPassword ? 'Create password' : 'Password'} type={showPassword ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} minLength={newPassword ? 12 : 1} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} aria-describedby={newPassword ? 'password-help' : undefined} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>}
              {newPassword && <><p id="password-help" className="auth-password-help">Use 12 or more characters. A unique passphrase works well.</p><div className="auth-strength" aria-hidden="true"><span className={password.length >= 4 ? 'filled' : ''}/><span className={password.length >= 8 ? 'filled' : ''}/><span className={password.length >= 12 ? 'filled' : ''}/></div><label>Confirm password<input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} /></label></>}
              <button className="auth-submit" type="submit">{pending ? 'Please wait…' : content.submit}<ArrowRight size={17} /></button>
            </fieldset>
          </form>
          {(state.error || googleState.error) && <p className="auth-error" role="alert">{state.error || googleState.error}</p>}
          {state.message && <p className="auth-success" role="status">{state.message}</p>}
          <p className="auth-switch">{mode === 'login' ? <>New to FitSync? <Link href="/signup">Create an account</Link></> : mode === 'signup' ? <>Already have an account? <Link href="/login">Sign in</Link></> : <Link href="/login">Back to sign in</Link>}</p>
          <div className="auth-security-note"><ShieldCheck size={16} /><span>Your progress starts with a private account.</span></div>
          <p className="auth-provider-note"><LockKeyhole size={12} /> Google sign-in never shares your Google password with FitSync.</p>
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
