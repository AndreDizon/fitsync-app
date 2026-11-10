'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SocialWorkspace } from '@/components/social-workspace'
import { HomeDashboard, type HomeDestination } from '@/components/home-dashboard'
import { HeroDetail } from '@/components/hero-detail'
import { Wordmark } from '@/components/wordmark'
import { PlaylistAccountProvider } from '@/lib/playlist-account'
import { PlaylistNavigationProvider, usePlaylistNavigation } from '@/lib/playlist-navigation'
import { PlaylistManager } from '@/components/playlist-manager'
import { NutritionWorkspace } from '@/components/nutrition-workspace'
import { MyPlanWorkspace } from '@/components/my-plan-workspace'
import { ExerciseLibrary } from '@/components/exercise-library'
import { PlanningProfileProvider, usePlanningProfile } from '@/lib/planning-profile'
import { loadAppStreak } from '@/lib/progress'
import { usePlanAccount } from '@/lib/playlist-account'
import { ProgressWorkspace } from './progress-workspace'
import type { OnboardingProfile } from '../../shared/onboarding'
import '@/app/coach-chat.css'
import { PlanSignout } from './plan-signout'
import {
  Activity,
  Apple,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Droplet,
  Droplets,
  Flame,
  Flag,
  Gamepad2,
  HeartPulse,
  Home,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Palette,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  Utensils,
  X,
  Zap,
} from 'lucide-react'

type Section = 'home' | 'plans' | 'library' | 'social' | 'progress' | 'settings'
type PlanTab = 'plan' | 'playlist' | 'library'

const navItems: { id: Section; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'plans', label: 'Plans', icon: CalendarDays },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'progress', label: 'Progress', icon: Activity },
]

const meals = [
  { name: 'Greek yogurt parfait', meta: 'Breakfast · 380 kcal', icon: Utensils, color: 'peach' },
  { name: 'Chicken power bowl', meta: 'Lunch · 540 kcal', icon: Apple, color: 'mint' },
  { name: 'Salmon & greens', meta: 'Dinner · 620 kcal', icon: Utensils, color: 'lavender' },
]

function Logo() {
 return <div className="brand-mark"><img src="/mascot/fox-logo.png" alt="FitSync fox mascot" /></div>
}

function App({ userName, userEmail }: { userName: string; userEmail: string }) {
  const firstName = userName.split(/\s+/)[0]
  const initials = userName.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const profile = usePlanningProfile()
  const timeZone = profile?.timeZone || 'Asia/Manila'
  const navigation = usePlaylistNavigation()
  const [active, setActiveState] = useState<Section>('home')
  const [planTab, setPlanTabState] = useState<PlanTab>('plan')
  const setActive = (section: Section) => { if (section !== active && (navigation?.current() ?? true)) { setHomeTarget(null); setActiveState(section) } }
  const setPlanTab = (tab: PlanTab) => { if (tab !== planTab && (navigation?.current() ?? true)) setPlanTabState(tab) }
  const [homeTarget, setHomeTarget] = useState<HomeDestination | null>(null)

  const [navOpen, setNavOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const [navHidden, setNavHidden] = useState(false)

  useEffect(() => {
    let previousY = Math.max(0, window.scrollY)
    setNavHidden(false)
    const handleScroll = () => {
      const currentY = Math.max(0, window.scrollY)
      if (currentY <= 24) {
        setNavHidden(false)
        previousY = currentY
        return
      }
      if (Math.abs(currentY - previousY) < 6) return
      setNavHidden(currentY > previousY)
      previousY = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [active])

  useEffect(() => {
    if (!navOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
      if (event.key !== 'Tab') return
      const buttons = drawerRef.current?.querySelectorAll<HTMLButtonElement>('button')
      if (!buttons?.length) return
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      requestAnimationFrame(() => menuButtonRef.current?.focus())
    }
  }, [navOpen])

  const navigate = (section: Section) => { setActive(section); setNavOpen(false) }

  const openFromHome = (target: HomeDestination) => {
    if (!(navigation?.current() ?? true)) return
    setHomeTarget(target); setPlanTabState(target.tab || 'plan'); setActiveState(target.page)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <main className="app-shell theme-default">
      {navOpen && <><div className="navigation-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />
      <aside className="desktop-sidebar navigation-drawer" id="left-navigation" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Main navigation">
        <div className="drawer-heading"><div className="brand"><Logo /><Wordmark /></div><button className="menu-toggle" onClick={() => setNavOpen(false)} aria-label="Close navigation"><X size={22} /></button></div>
        <div className="side-profile"><div className="avatar">{initials}</div><div><strong>{userName}</strong><small>Balanced beginner</small></div><ChevronRight size={16} /></div>
        <nav className="side-nav" aria-label="Sections">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={19} />{label}</button>)}</nav>
        <div className="side-bottom"><button onClick={() => navigate('settings')}><Settings size={18} />Settings</button><div className="coach-card"><Sparkles size={18} /><strong>Ask your AI coach</strong><span>Get personalized guidance</span><button onClick={() => navigate('social')}>Start chat <ArrowRight size={14} /></button></div></div>
      </aside></>}

      <section className="content-wrap" inert={navOpen}>
        <header className="topbar"><div className="header-brand"><button className="menu-toggle" ref={menuButtonRef} onClick={() => setNavOpen(true)} aria-label="Open navigation" aria-expanded={navOpen} aria-controls="left-navigation"><Menu size={22} /></button><div className="mobile-brand"><Logo /><Wordmark /></div></div><div className="top-actions"><button aria-label="Search"><Search size={19} /></button><button className="profile-button" onClick={() => setActive('settings')}><div className="avatar small">{initials}</div><span>{firstName}</span><ChevronRight size={15} /></button></div></header>

        {active === 'home' && <HomeView displayName={firstName} timeZone={timeZone} onOpen={openFromHome} />}
        {active === 'plans' && <PlansWorkspace tab={planTab} setTab={setPlanTab} initialMode={homeTarget?.mode} focusWater={homeTarget?.water} />}
        {active === 'library' && <LibraryView />}
        {active === 'social' && <SocialView initialSection={homeTarget?.socialSection} />}
        {active === 'progress' && <ProgressWorkspace initialTab={homeTarget?.progressTab} />}
        {active === 'settings' && <SettingsView userName={userName} userEmail={userEmail} initials={initials} />}
        <AppFooter onNavigate={(section) => { navigate(section); setNavHidden(false); window.scrollTo(0, 0) }} onPlaylist={() => { setPlanTab('playlist'); navigate('plans'); setNavHidden(false); window.scrollTo(0, 0) }} />
      </section>

      <nav className={`mobile-nav${navHidden ? ' nav-hidden' : ''}`} aria-label="Bottom navigation" aria-hidden={navHidden} inert={navOpen || navHidden}>{[navItems.slice(0, 2), navItems.slice(2)].map((items, index) => <div className="nav-page-group" key={index}>{items.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined} aria-label={label} onClick={() => setActive(id)}><Icon size={20} /><span>{label}</span></button>)}</div>)}<button className="nav-playlist" aria-label="Open playlist" title="Open playlist" onClick={() => { setPlanTab('playlist'); setActive('plans'); setNavHidden(false); window.scrollTo(0, 0) }}><Play size={23} fill="currentColor" /></button></nav>

    </main>
  )
}

function AppFooter({ onNavigate, onPlaylist }: { onNavigate: (section: Section) => void; onPlaylist: () => void }) {
  return <footer className="fitsync-footer">
    <div className="footer-mascot-peek" aria-hidden="true"><img src="/mascot/fox-greeting.png" width="1145" height="1374" alt="" /></div>
    <div className="footer-panel">
      <div className="footer-main">
        <div className="footer-brand"><button onClick={() => onNavigate('home')} aria-label="FitSync home"><Logo /><Wordmark /></button><p>Move. Fuel. Feel good.</p></div>
        <nav className="footer-links" aria-label="Explore FitSync"><h2>Explore</h2><button onClick={() => onNavigate('plans')}>Your plans</button><button onClick={onPlaylist}>Your playlist</button><button onClick={() => onNavigate('social')}>Community</button></nav>
        <div className="footer-action"><h2>Let’s stay in sync.</h2><p>Questions, ideas, or feedback?<br />We’d love to hear from you.</p><div className="footer-contact-row"><button disabled>Contact us <ArrowUpRight size={16} aria-hidden="true" /></button><span>Coming soon</span></div></div>
      </div>
      <div className="footer-bottom"><p>© {new Date().getFullYear()} FitSync</p><button onClick={() => { window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }}>Back to top <ArrowUpRight size={15} aria-hidden="true" /></button></div>
      <img className="footer-corner-fox" src="/mascot/fox-logo.png" width="1254" height="1254" alt="" aria-hidden="true" />
    </div>
  </footer>
}

function HomeView({ displayName, timeZone, onOpen }: { displayName: string; timeZone: string; onOpen: (destination: HomeDestination) => void }) {
  const owner = usePlanAccount()
  const [now, setNow] = useState(() => new Date())
  const [streak, setStreak] = useState<number | null>(null)
  const [streakUnavailable, setStreakUnavailable] = useState(false)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    let active = true
    if (!owner) {
      setStreak(0)
      setStreakUnavailable(false)
      return
    }
    const updateStreak = () => {
      void loadAppStreak(owner, timeZone).then(value => {
        if (active) {
          setStreak(value)
          setStreakUnavailable(false)
        }
      }).catch(() => {
        if (active) {
          setStreak(null)
          setStreakUnavailable(true)
        }
      })
    }
    const updateWhenVisible = () => {
      if (document.visibilityState === 'visible') updateStreak()
    }
    updateStreak()
    const timer = setInterval(updateStreak, 5 * 60_000)
    document.addEventListener('visibilitychange', updateWhenVisible)
    return () => {
      active = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', updateWhenVisible)
    }
  }, [owner, timeZone])
  const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone }).format(now)
  return <div className="page home-page"><div className="ambient-shape shape-one" aria-hidden="true" /><div className="ambient-shape shape-two" aria-hidden="true" /><div className="home-greeting-frame"><div className="greeting greeting-with-mascot"><div className="greeting-copy"><p className="eyebrow home-date-eyebrow"><span>{timeZone}</span><span aria-hidden="true"> · </span><span>{dateLabel}</span></p><h1><span className="greeting-title-line"><span className="greeting-salutation">Good morning,</span> <span className="greeting-name">{displayName} <Sparkles className="greeting-spark" size={18} /></span></span><span className="greeting-title-line greeting-progress-line">today is for <span className="greeting-progress">Progress</span></span></h1><p className="muted">Every small step is a huge leap tommorow.</p><svg className="greeting-trend-art" viewBox="-88 -3 728 82" preserveAspectRatio="none" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id="greeting-trend-fill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="125"><stop stopColor="#b28b46" stopOpacity=".28" /><stop offset=".55" stopColor="#bc8e37" stopOpacity=".13" /><stop offset="1" stopColor="#bc8e37" stopOpacity="0" /></linearGradient></defs><g fill="#70603c" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="400" textAnchor="start">{[[8,"80 units"],[28,"50 units"],[48,"20 units"],[68,"0 units"]].map(([y,label]) => <text key={label} x="-84" y={Number(y) + 4}>{label}</text>)}</g><g stroke="#a88a49" strokeOpacity=".48" strokeWidth="1.2" strokeDasharray="4 4">{[8, 28, 48, 68].map((y) => <path key={y} d={`M-26 ${y}H637`} />)}</g><path d="M-26 86C-16 80 -6 74 3 68C25 50 40 45 60 45S100 52 120 52S160 38 180 38S225 56 245 56S305 25 330 25S385 45 410 45S465 14 485 14S515 28 535 28S585 8 610 8H632V125H-26Z" fill="url(#greeting-trend-fill)" /><path d="M-26 86C-16 80 -6 74 3 68C25 50 40 45 60 45S100 52 120 52S160 38 180 38S225 56 245 56S305 25 330 25S385 45 410 45S465 14 485 14S515 28 535 28S585 8 610 8H632" stroke="#ac8544" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /><g fill="#ac8544" stroke="#fff7d9" strokeWidth="2.5">{[[60,45],[120,52],[180,38],[245,56],[330,25],[410,45],[485,14],[535,28]].map(([cx,cy]) => <circle key={cx} cx={cx} cy={cy} r="4.5" />)}</g><circle cx="632" cy="8" r="10" fill="#c99c48" fillOpacity=".14" /><circle cx="632" cy="8" r="6" fill="#ac8544" stroke="#fff7d9" strokeWidth="3" /></svg><HeroDetail variant="home" /><img className="hero-card-art home-card-art" src="/mascot/hero-fox-head.png" alt="" aria-hidden="true" /></div><div className="greeting-fox-stage"><img className="greeting-fox" src="/mascot/fox-greeting.png" alt="FitSync fox giving a thumbs-up" width={1138} height={1355} fetchPriority="high" /></div><div className="streak"><Flame size={19} fill="currentColor" /><strong>{streak ?? '—'}</strong><span>{streakUnavailable ? 'streak unavailable' : 'day streak'}</span></div></div></div>
    <HomeDashboard onOpen={onOpen} />
  </div>
}

function PlansWorkspace({ tab, setTab, initialMode = 'workout', focusWater = false }: { tab: PlanTab; setTab: (tab: PlanTab) => void; initialMode?: 'workout' | 'nutrition'; focusWater?: boolean }) {
  const navigation = usePlaylistNavigation()
  const [mode, setModeState] = useState<'nutrition' | 'workout'>(initialMode)
  const setMode = (next: 'nutrition' | 'workout') => { if (next !== mode && (navigation?.current() ?? true)) setModeState(next) }
  return <div className="page plans-page plan-workspace">
    <div className="plan-hero-frame"><div className={`plans-hero plans-mascot-hero ${mode}`}><img className="hero-card-art plan-mode-art" src={mode === 'workout' ? '/mascot/hero-dumbbell.png' : '/mascot/hero-apple.png'} alt="" aria-hidden="true" />
      <svg className="plan-hero-lines" viewBox="0 0 1000 300" preserveAspectRatio="none" fill="none" aria-hidden="true">{mode === 'workout' ? <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M-30 62h145c48 0 48 50 96 50h160c48 0 48-50 96-50h150c48 0 48 50 96 50h155c48 0 48-50 96-50h66" /><path d="M-30 82h135c48 0 48 50 96 50h180c48 0 48-50 96-50h130c48 0 48 50 96 50h175c48 0 48-50 96-50h66" /><path d="M-30 218h155c48 0 48-50 96-50h150c48 0 48 50 96 50h165c48 0 48-50 96-50h150c48 0 48 50 96 50h26" /><path d="M-30 238h145c48 0 48-50 96-50h170c48 0 48 50 96 50h145c48 0 48-50 96-50h170c48 0 48 50 96 50h26" /><circle cx="211" cy="112" r="5" fill="currentColor" stroke="none" /><circle cx="559" cy="62" r="5" fill="currentColor" stroke="none" /><circle cx="755" cy="168" r="5" fill="currentColor" stroke="none" /><circle cx="422" cy="218" r="5" fill="currentColor" stroke="none" /></g> : <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M-30 92c115 0 115 34 220 34s105-34 210-34 105 34 210 34 105-34 210-34 105 34 210 34 105-34 220-34" /><path d="M-30 112c115 0 115 34 220 34s105-34 210-34 105 34 210 34 105-34 210-34 105 34 210 34 105-34 220-34" /><path d="M-30 208c115 0 115-34 220-34s105 34 210 34 105-34 210-34 105 34 210 34 105-34 210-34 105 34 220 34" /><path d="M-30 228c115 0 115-34 220-34s105 34 210 34 105-34 210-34 105 34 210 34 105-34 210-34 105 34 220 34" /><circle cx="110" cy="122" r="5.5" fill="currentColor" stroke="none" /><circle cx="500" cy="122" r="5.5" fill="currentColor" stroke="none" /><circle cx="890" cy="122" r="5.5" fill="currentColor" stroke="none" /><circle cx="305" cy="180" r="5.5" fill="currentColor" stroke="none" /><circle cx="695" cy="180" r="5.5" fill="currentColor" stroke="none" /></g>}</svg>
      <HeroDetail variant="plans" /><div className="plan-hero-copy"><p className="eyebrow">YOUR PERSONAL PLAN</p><h1>{mode === 'workout' ? <>Train with <span className="plan-title-highlight">Intention</span></> : <>Fuel your <span className="plan-title-highlight">Momentum.</span></>}</h1><p className="muted intro">A clear, flexible week built around your goals.</p><div className={`plan-mode-switch ${mode}`} role="group" aria-label="Plan mode"><button className={mode === 'workout' ? 'active' : ''} aria-pressed={mode === 'workout'} onClick={() => setMode('workout')}><Dumbbell size={15} />Workout</button><button className={mode === 'nutrition' ? 'active' : ''} aria-pressed={mode === 'nutrition'} onClick={() => setMode('nutrition')}><Apple size={15} />Nutrition</button></div></div>
      <div className="plan-hero-mascot"><img src={mode === 'workout' ? '/mascot/fox-plan-workout.png' : '/mascot/fox-plan-nutrition.png'} alt={mode === 'workout' ? 'FitSync fox lifting a dumbbell' : 'FitSync fox enjoying an apple'} width="1254" height="1254" /></div>
    </div>
    <div className="plan-tabs" role="tablist" aria-label="Plan sections">{([{ id: 'plan', label: 'My plan', icon: CalendarDays }, { id: 'playlist', label: 'Playlist', icon: Play }, { id: 'library', label: 'Library', icon: BookOpen }] as const).map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)} role="tab" aria-selected={tab === id}><Icon size={16} />{label}</button>)}</div></div>
    <div className="plan-folder-content">{tab === 'plan' ? <MyPlanWorkspace kind={mode} focusWater={focusWater} /> : tab === 'playlist' ? <PlaylistManager key={mode} kind={mode} /> : mode === 'nutrition' ? <NutritionWorkspace tab="library" setTab={setTab} /> : <LibraryView />}</div>
  </div>
}

function LibraryView() { return <ExerciseLibrary /> }

function SocialHeroArtwork() {
  return <div className="social-hero-art" aria-hidden="true">
    <img className="social-world" src="/mascot/social-connected-earth.png" width="1408" height="1120" alt="" />
    <svg className="social-phone-signal" viewBox="0 0 180 120" fill="none">
      <defs><filter id="social-signal-glow"><feGaussianBlur stdDeviation="3" /></filter></defs>
      <g stroke="#ffe58a" strokeWidth="8" filter="url(#social-signal-glow)" opacity=".8"><path d="M145 101Q118 81 126 55M127 104Q91 73 108 38M109 108Q65 65 91 20" /></g>
      <g stroke="#fffbea" strokeWidth="2.5" strokeLinecap="round"><path d="M145 101Q118 81 126 55M127 104Q91 73 108 38M109 108Q65 65 91 20" /></g>
    </svg>
    <img className="social-phone-fox" src="/mascot/fox-social-phone.png" width="1254" height="1254" alt="" />
  </div>
}
function SocialView({ initialSection }: { initialSection?: 'forum' | 'people' | 'gym' }) {
  const [selectedDate, setSelectedDate] = useState('')
  return <div className="page social-page social-flow"><div className="social-hero-frame"><div className="social-hero-card"><HeroDetail variant="social" /><img className="hero-card-art social-card-art" src="/mascot/hero-social-phone.png" alt="" aria-hidden="true" /><svg className="social-hero-line-art" viewBox="0 0 800 350" preserveAspectRatio="none" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth=".9"><path d="M0 58H170Q196 58 210 78L244 126Q258 146 286 146H800"/><path d="M0 74H160Q184 74 198 94L232 142Q246 162 274 162H800"/><path d="M0 90H150Q172 90 186 110L220 158Q234 178 262 178H800"/><path d="M0 286H200Q228 286 246 264L302 204Q320 186 348 186H800"/><path d="M0 302H212Q240 302 258 280L314 220Q332 202 360 202H800"/><path d="M0 318H224Q252 318 270 296L326 236Q344 218 372 218H800"/></g></svg><SocialHeroArtwork /><div className="social-intro"><div><p className="eyebrow">COMMUNITY · 12,840 MEMBERS</p><h1>Your support <span className="plan-title-highlight">circle</span></h1><p className="muted intro">A place to ask, share, and keep showing <span className="social-subtitle-ending">up together.</span></p></div><div className="community-orb" aria-hidden="true"><Users size={27} /></div></div><div className="social-date-filter"><label htmlFor="social-date">Show posts for:</label><input id="social-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></div></div><aside className="social-connection-card"><Users size={24} aria-hidden="true" /><p>GLOBAL CONNECTION</p><strong>12,840</strong><span>community members</span></aside></div>
    <SocialWorkspace date={selectedDate} initialSection={initialSection}/>
  </div>
}


function SettingsView({ userName, userEmail, initials }: { userName: string; userEmail: string; initials: string }) { return <div className="page"><p className="eyebrow">ACCOUNT</p><h1>Settings</h1><p className="muted intro">Make <Wordmark /> work for you.</p><div className="settings-profile"><div className="avatar">{initials}</div><div><strong>{userName}</strong><span>{userEmail}</span></div><button>Edit</button></div><div className="settings-group"><p>Preferences</p><button onClick={() => window.location.assign('/onboarding')}><span><Flag size={17} />Goals &amp; planning preferences</span><small>Edit <ChevronRight size={16} /></small></button><button><span><Sparkles size={17} />Notifications</span><small>On <ChevronRight size={16} /></small></button><div className="default-theme-setting"><div><Palette size={17} /><span>Theme</span></div><div className="default-theme-preview"><span className="theme-colors" aria-hidden="true"><i /><i /><i /></span><strong>Fox Energy</strong><small>Default</small><Check size={15} /></div><p>Vibrant, sporty daytime. Built for your next move.</p></div><button><span><MapPin size={17} />Offline mode</span><small>Off <ChevronRight size={16} /></small></button></div><div className="settings-group"><p>Data & account</p><button><span><DownloadIcon />Export your data</span><ChevronRight size={16} /></button><button><span><UserRound size={17} />Contact the team</span><ChevronRight size={16} /></button></div><PlanSignout /></div> }
function MoonIcon() { return <span className="tiny-icon">☾</span> } function DownloadIcon() { return <span className="tiny-icon">↓</span> }

export default function Dashboard({ profile, accountId = null, ...props }: { userName: string; userEmail: string; accountId?: string | null; profile: OnboardingProfile }) {
  return <PlaylistAccountProvider id={accountId} timeZone={profile.timeZone}><PlaylistNavigationProvider><PlanningProfileProvider profile={profile}><App {...props} /></PlanningProfileProvider></PlaylistNavigationProvider></PlaylistAccountProvider>
}
