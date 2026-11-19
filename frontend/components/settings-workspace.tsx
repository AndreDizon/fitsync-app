'use client'

import { ArrowUpRight, Check, Flag, Palette, ShieldCheck, UserRound } from 'lucide-react'
import { homeThemes, type HomeTheme } from './home-theme-preview'
import { NotificationSettings } from './notification-settings'
import { AccountSecuritySettings } from './account-security-settings'
import { PlanSignout } from './plan-signout'
import { scrollToProgressSection } from '@/lib/progress-section-navigation'
import '@/app/settings-workspace.css'

const appearances = homeThemes

export function SettingsWorkspace({ userName, userEmail, initials, theme, setTheme }: {
  userName: string; userEmail: string; initials: string; theme: HomeTheme;
  setTheme: (theme: HomeTheme) => void; onProgress: () => void;
}) {
  return <div className="page settings-page st-workspace">
    <p className="eyebrow">YOUR ACCOUNT · YOUR PREFERENCES</p>
    <h1>Make FitSync fit you.</h1>
    <p className="muted intro">Your account, training preferences and app appearance, all in one place.</p>

    <nav className="st-shortcuts" aria-label="Settings sections" onClick={scrollToProgressSection}>
      <a href="#settings-account"><UserRound size={16}/>Account</a>
      <a href="#settings-planning"><Flag size={16}/>Planning</a>
      <a href="#settings-appearance"><Palette size={16}/>Appearance</a>
      <a href="#settings-notifications">Notifications</a>
      <a href="#settings-security"><ShieldCheck size={16}/>Security</a>
    </nav>

    <div className="st-layout">
      <section className="st-card st-account" id="settings-account" aria-labelledby="st-account-title">
        <header className="st-card-heading"><span className="st-icon"><UserRound size={21}/></span><div><h2 id="st-account-title">Your account</h2><p>The details you use with FitSync.</p></div></header>
        <div className="st-account-body">
          <div className="st-identity"><span className="st-avatar" aria-hidden="true">{initials}</span><strong>{userName || 'FitSync member'}</strong></div>
          <dl><div><dt>Email</dt><dd>{userEmail || 'Not provided'}</dd></div></dl>
          <p className="st-caption">These details come from your current sign-in.</p>
        </div>
      </section>

      <section className="st-card st-planning" id="settings-planning" aria-labelledby="st-planning-title">
        <header className="st-card-heading"><span className="st-icon"><Flag size={21}/></span><div><h2 id="st-planning-title">Your training, your way.</h2><p>Keep your next plan in step with your routine.</p></div></header>
        <div className="st-card-body">
          <p>Update your goals, training days, workout start time, equipment and food preferences.</p>
          <div className="st-preference-topics"><span>Workouts &amp; schedule</span><span>Food &amp; meal planning</span></div>
          <button className="st-primary" onClick={() => window.location.assign('/onboarding')}>Edit planning preferences<ArrowUpRight size={17}/></button>
          <p className="st-caption">Updated preferences guide newly generated plans. Your existing entries stay as you saved them.</p>
        </div>
      </section>

      <section className="st-card st-appearance" id="settings-appearance" aria-labelledby="st-appearance-title">
        <header className="st-card-heading"><span className="st-icon"><Palette size={21}/></span><div><h2 id="st-appearance-title">Find your look.</h2><p>A brighter day or a quieter night. Your choice.</p></div></header>
        <div className="st-card-body">
          <fieldset className="st-theme-options"><legend>Choose an app theme</legend>{appearances.map(option => <label className={'st-theme-option' + (theme === option.id ? ' is-selected' : '')} key={option.id}>
            <input type="radio" name="settings-theme" value={option.id} checked={theme === option.id} onChange={() => setTheme(option.id)}/>
            <span className={'st-theme-preview st-theme-' + option.id} style={{backgroundColor:option.base,backgroundImage:option.image}} aria-hidden="true"><span className="st-preview-header" style={{background:option.header}}/><span className="st-preview-content"><i/><i/></span><span className="st-preview-button"/></span>
            <span className="st-theme-copy"><strong>{option.name}</strong><small>{option.description}</small></span>
            <span className="st-theme-check" aria-hidden="true">{theme === option.id && <Check size={14}/>}</span>
          </label>)}</fieldset>
          <p className="st-caption" role="status">{appearances.find(option => option.id === theme)?.name} is applied. Your choice is saved on this device.</p>
        </div>
      </section>

      <NotificationSettings/>
      <AccountSecuritySettings/>
    </div>
    <section className="st-session" aria-label="Sign out of FitSync"><div><h2>Done for now?</h2><p>Sign out of this account on this device.</p></div><PlanSignout/></section>
  </div>
}
