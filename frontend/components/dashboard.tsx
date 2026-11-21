'use client'

import { heroImage, heroAssetUrl } from '@/lib/hero-images'
import { HeroAssetWarmer, HeroImagePreloads } from '@/components/hero-asset-loading'
import '@/app/content-heading-system.css'
import '@/app/footer-official.css'
import '@/app/navigation-drawer.css'
import '@/app/folder-tab-motion.css'

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
import '@/app/home-typography.css'
import '@/app/home-palette.css'
import '@/app/home-surfaces.css'
import '@/app/plans-design.css'
import '@/app/shared-app-design.css'
import '@/app/responsive-sections.css'
import '@/app/plan-card-materials.css'
import { useHomeTheme } from './home-theme-preview'
import { FooterSocialIcon } from './footer-social-icon'
import { SettingsWorkspace } from './settings-workspace'
import { HeaderNotifications } from './header-notifications'
import { AccountPreview } from './account-preview'
import { NotificationProvider, type NotificationTarget } from '@/lib/notifications'
import { isNotificationTarget } from '../../shared/notifications'
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
  Heart,
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

const navItems: { id: Section; label: string; description: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', description: 'Your daily overview', icon: Home },
  { id: 'plans', label: 'Plans', description: 'Workouts, meals & library', icon: CalendarDays },
  { id: 'social', label: 'Social', description: 'Your community', icon: Users },
  { id: 'progress', label: 'Progress', description: 'Records & milestones', icon: Activity },
]

const meals = [
  { name: 'Greek yogurt parfait', meta: 'Breakfast · 380 kcal', icon: Utensils, color: 'peach' },
  { name: 'Chicken power bowl', meta: 'Lunch · 540 kcal', icon: Apple, color: 'mint' },
  { name: 'Salmon & greens', meta: 'Dinner · 620 kcal', icon: Utensils, color: 'lavender' },
]

function Logo() {
 return <div className="brand-mark"><img src={heroAssetUrl('fox-logo-192.webp')} alt="FitSync fox mascot" /></div>
}

function App({ userName: initialUserName, userEmail }: { userName: string; userEmail: string }) {
  const [userName,setUserName]=useState(initialUserName)
  useEffect(()=>setUserName(initialUserName),[initialUserName])
  const [accountOpen,setAccountOpen]=useState(false)
  const accountButton=useRef<HTMLButtonElement>(null)
  const accountFromDrawer=useRef(false)
  const accountReturnTarget=useRef<HTMLElement|null>(null)
  const { theme, setTheme, themeStyle, isDark, isHeaderDark } = useHomeTheme()
  const notificationOwner = usePlanAccount() || 'local-tester'
  const firstName = userName.split(/\s+/)[0]
  const initials = userName.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const profile = usePlanningProfile()
  const timeZone = profile?.timeZone || 'Asia/Manila'
  const navigation = usePlaylistNavigation()
  const [active, setActiveState] = useState<Section>('home')
  const [planTab, setPlanTabState] = useState<PlanTab>('plan')
  const setActive = async (section: Section) => { if ((section !== active || notificationDestination !== null) && (await navigation?.current() ?? true)) { setHomeTarget(null); if(notificationDestination){setNotificationDestination(null);setNotificationVersion(value=>value+1)} setActiveState(section) } }
  const setPlanTab = async (tab: PlanTab) => { if (tab !== planTab && (await navigation?.current() ?? true)) setPlanTabState(tab) }
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
      if(!accountFromDrawer.current)requestAnimationFrame(() => menuButtonRef.current?.focus())
    }
  }, [navOpen])

  const navigate = (section: Section) => { setActive(section); setNavOpen(false) }

  const [notificationDestination,setNotificationDestination] = useState<NotificationTarget|null>(null)
  const [notificationVersion,setNotificationVersion] = useState(0)
  useEffect(()=>{
    const open = async (target:NotificationTarget)=>{if(!isNotificationTarget(target))return;if(!(await navigation?.current() ?? true))return;setNotificationDestination(target);setNotificationVersion(value=>value+1);if(target.page==='plans'){setPlanTabState('plan');setHomeTarget({page:'plans',mode:target.mode||'workout',water:target.water})}else if(target.page==='progress')setHomeTarget({page:'progress',progressTab:target.tab||'achievements'});setActiveState(target.page);if(target.page==='social'&&target.postId)window.dispatchEvent(new CustomEvent('fitsync-social-post-seen',{detail:{owner:notificationOwner,postId:target.postId,comments:true}}));window.scrollTo({top:0,behavior:'instant'})}
    const event=(event:Event)=>void open((event as CustomEvent<NotificationTarget>).detail)
    const message=(event:MessageEvent)=>{if(event.data?.type==='fitsync-notification-open')void open(event.data.target)}
    window.addEventListener('fitsync-notification-open',event);navigator.serviceWorker?.addEventListener('message',message)
    const params=new URLSearchParams(location.search),raw=params.get('notification');if(raw){try{void open(JSON.parse(raw));params.delete('notification');history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash)}catch{}}
    return()=>{window.removeEventListener('fitsync-notification-open',event);navigator.serviceWorker?.removeEventListener('message',message)}
  },[navigation,notificationOwner])

  const openFromHome = async (target: HomeDestination) => {
    if (!(await navigation?.current() ?? true)) return
    setNotificationDestination(null); setHomeTarget(target); setPlanTabState(target.tab || 'plan'); setActiveState(target.page)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <main className="app-shell theme-default" data-section={active} data-home-preview="true" data-home-theme={theme} data-home-preview-dark={isDark} data-home-header-dark={isHeaderDark} style={themeStyle}>
      {navOpen && <><div className="navigation-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />
      <aside className="desktop-sidebar navigation-drawer" id="left-navigation" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Main navigation">
        <div className="drawer-heading"><div className="brand"><Logo /><Wordmark /></div><button className="menu-toggle" onClick={() => setNavOpen(false)} aria-label="Close navigation"><X size={22} /></button></div>
        <button className="drawer-profile" onClick={() => {accountReturnTarget.current=null;accountFromDrawer.current=true;setNavOpen(false);setAccountOpen(true)}} aria-label="Open account preview" aria-haspopup="dialog"><span className="avatar" aria-hidden="true">{initials}</span><span className="drawer-profile-copy"><strong>{userName}</strong><small>{userEmail || 'Your FitSync account'}</small></span><ChevronRight size={17} aria-hidden="true"/></button>
        <nav className="side-nav" aria-label="Sections">{navItems.map(({ id, label, description, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} aria-label={label} aria-current={active === id ? 'page' : undefined} onClick={() => navigate(id)}><span className="drawer-nav-icon"><Icon size={21} aria-hidden="true"/></span><span className="drawer-nav-copy"><strong>{label}</strong><small>{description}</small></span><ChevronRight className="drawer-nav-chevron" size={16} aria-hidden="true"/></button>)}</nav>
        <div className="side-bottom"><button className={active === 'settings' ? 'active' : ''} aria-current={active === 'settings' ? 'page' : undefined} onClick={() => navigate('settings')}><Settings size={20} aria-hidden="true"/>Settings<ChevronRight size={16} aria-hidden="true"/></button><p className="drawer-signature">Move. Fuel. Feel good.</p></div>
      </aside></>}

      <HeroAssetWarmer /><link rel="preload" as="image" href={heroAssetUrl('fox-logo-192.webp')} fetchPriority="high" />
      <section className="content-wrap" inert={navOpen}>
        <header className="topbar"><div className="header-brand"><button className="menu-toggle" ref={menuButtonRef} onClick={() => setNavOpen(true)} aria-label="Open navigation" aria-expanded={navOpen} aria-controls="left-navigation"><Menu size={22} /></button><div className="mobile-brand"><Logo /><Wordmark /></div></div><div className="top-actions"><HeaderNotifications onSettings={() => { setActive('settings'); requestAnimationFrame(()=>{const panel=document.getElementById('settings-notifications');if(panel instanceof HTMLDetailsElement)panel.open=true;panel?.scrollIntoView({behavior:'smooth',block:'start'})}) }} /><button className="profile-button" ref={accountButton} aria-label="Open account preview" aria-haspopup="dialog" aria-expanded={accountOpen} onClick={() => {accountReturnTarget.current=null;accountFromDrawer.current=false;setAccountOpen(true)}}><div className="avatar small">{initials}</div><span>{firstName}</span><ChevronRight size={15} /></button></div></header>
        {accountOpen&&<AccountPreview username={userName} email={userEmail} onSaved={setUserName} onClose={()=>{setAccountOpen(false);requestAnimationFrame(()=>{(accountReturnTarget.current||(accountFromDrawer.current?menuButtonRef:accountButton).current)?.focus();accountFromDrawer.current=false;accountReturnTarget.current=null})}}/>}

        {active === 'home' && <><HomeView displayName={firstName} timeZone={timeZone} onOpen={openFromHome} /></>}
        {active === 'plans' && <PlansWorkspace key={notificationVersion} tab={planTab} setTab={setPlanTab} initialMode={homeTarget?.mode} focusWater={homeTarget?.water} initialDate={notificationDestination?.page==='plans'?notificationDestination.date:undefined} />}
        {active === 'library' && <LibraryView />}
        {active === 'social' && <SocialView key={notificationVersion} initialSection={notificationDestination?.page==='social'?notificationDestination.kind:homeTarget?.socialSection} initialPostId={notificationDestination?.page==='social'?notificationDestination.postId:undefined} />}
        {active === 'progress' && <ProgressWorkspace key={notificationVersion} initialTab={homeTarget?.progressTab} userName={userName} />}
        {active === 'settings' && <SettingsWorkspace userName={userName} userEmail={userEmail} initials={initials} theme={theme} setTheme={setTheme} onEditAccount={()=>{accountReturnTarget.current=document.activeElement instanceof HTMLElement?document.activeElement:null;accountFromDrawer.current=false;setAccountOpen(true)}} onProgress={() => setActive('progress')} />}
        <AppFooter onNavigate={(section) => { navigate(section); setNavHidden(false); window.scrollTo(0, 0) }} />
      </section>

      <nav className={`mobile-nav${navHidden ? ' nav-hidden' : ''}`} aria-label="Bottom navigation" aria-hidden={navHidden} inert={navOpen || navHidden}>{[navItems.slice(0, 2), navItems.slice(2)].map((items, index) => <div className="nav-page-group" key={index}>{items.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined} aria-label={label} onClick={() => setActive(id)}><Icon size={20} /><span>{label}</span></button>)}</div>)}<button className="nav-playlist" aria-label="Open playlist" title="Open playlist" onClick={() => { setPlanTab('playlist'); setActive('plans'); setNavHidden(false); window.scrollTo(0, 0) }}><Play size={23} fill="currentColor" /></button></nav>

    </main>
  )
}

function AppFooter({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const aboutRef = useRef<HTMLDialogElement>(null)
  return <footer className="fitsync-footer footer-official">
    <div className="footer-mascot-peek" aria-hidden="true"><img loading="lazy" {...heroImage('fox-greeting')} width="1145" height="1374" alt="" /></div>
    <div className="footer-panel">
      <div className="footer-main footer-home-main">
        {<div className="footer-home-intro"><div className="footer-brand"><button onClick={() => onNavigate('home')} aria-label="FitSync home"><Logo /><Wordmark /></button><p>Move. Fuel. Feel good.</p></div><button className="footer-top-action" onClick={() => window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>Back to top <ArrowUpRight size={18}/></button></div>}
        {<div className="footer-home-columns">
          <nav className="footer-home-column" aria-label="Footer navigation"><h2>Explore</h2><button onClick={() => onNavigate('home')}>Home</button><button onClick={() => onNavigate('plans')}>Plans</button><button onClick={() => onNavigate('social')}>Social</button><button onClick={() => onNavigate('progress')}>Progress</button></nav>
          <section className="footer-home-column"><h2>Contact &amp; Location</h2><p className="footer-home-detail"><strong>Email</strong><span>hello@fitsync.example</span></p><p className="footer-home-detail"><strong>Location</strong><span>123 Movement Street<br/>Manila, Philippines</span></p></section>
          <section className="footer-home-column"><h2>Connect</h2><div className="footer-social-profiles" aria-label="Example social profiles">{['Facebook','Instagram','X','YouTube'].map(name=><div key={name} className="footer-social-profile"><span className={"footer-social-icon footer-social-icon-" + name.toLowerCase()} role="img" aria-label={name}><FooterSocialIcon platform={name}/></span><span><span>@fitsync.example</span></span></div>)}</div></section>
          <section className="footer-home-column footer-home-contact-column"><div className="footer-action footer-home-contact"><h2>Let’s stay in sync.</h2><p>Questions, ideas, or feedback?<br/>We’d love to hear from you.</p><div className="footer-contact-row"><button type="button" disabled>Contact us</button><button type="button" onClick={() => aboutRef.current?.showModal()}>About us</button></div></div></section>
        </div>}
      </div>
      <div className="footer-bottom footer-home-bottom">{<><div className="footer-policy-previews" aria-label="Example legal policies"><span>Terms of Use</span><span>Privacy Policy</span><span>Cookie Policy</span></div><div className="footer-home-rights"><p>© {new Date().getFullYear()} FitSync. All rights reserved.</p><p className="footer-build-credit">Built by FitSync with <Heart size={13} fill="currentColor" className="footer-credit-heart" aria-label="care" role="img"/></p></div></>}</div>
      <img className="footer-corner-fox" src={heroAssetUrl('fox-logo-192.webp')} width="1254" height="1254" alt="" aria-hidden="true" />
    </div>
    {<dialog ref={aboutRef} className="footer-about-dialog"><div className="footer-about-heading"><h2>About FitSync</h2><button onClick={() => aboutRef.current?.close()} aria-label="Close about FitSync">×</button></div><p>Move. Fuel. Feel good.</p><p>FitSync brings your workout plans, food schedules, progress records and community into one place.</p><button className="footer-about-done" onClick={() => aboutRef.current?.close()}>Got it</button></dialog>}
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
  return <div className="page home-page"><HeroImagePreloads page="home" /><div className="ambient-shape shape-one" aria-hidden="true" /><div className="ambient-shape shape-two" aria-hidden="true" /><div className="home-greeting-frame"><div className="greeting greeting-with-mascot"><div className="greeting-copy"><p className="eyebrow home-date-eyebrow"><span>{timeZone}</span><span aria-hidden="true"> · </span><span>{dateLabel}</span></p><h1><span className="greeting-title-line"><span className="greeting-salutation">Good morning,</span> <span className="greeting-name">{displayName}</span></span><span className="greeting-title-line greeting-progress-line">today is for <span className="greeting-progress">Progress</span></span></h1><p className="muted">Every small step is a huge leap tommorow.</p><svg className="greeting-trend-art" viewBox="-88 -3 728 82" preserveAspectRatio="none" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id="greeting-trend-fill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="125"><stop stopColor="#b28b46" stopOpacity=".28" /><stop offset=".55" stopColor="#bc8e37" stopOpacity=".13" /><stop offset="1" stopColor="#bc8e37" stopOpacity="0" /></linearGradient></defs><g fill="#70603c" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="400" textAnchor="start">{[[8,"80 units"],[28,"50 units"],[48,"20 units"],[68,"0 units"]].map(([y,label]) => <text key={label} x="-84" y={Number(y) + 4}>{label}</text>)}</g><g stroke="#a88a49" strokeOpacity=".48" strokeWidth="1.2" strokeDasharray="4 4">{[8, 28, 48, 68].map((y) => <path key={y} d={`M-26 ${y}H637`} />)}</g><path d="M-26 86C-16 80 -6 74 3 68C25 50 40 45 60 45S100 52 120 52S160 38 180 38S225 56 245 56S305 25 330 25S385 45 410 45S465 14 485 14S515 28 535 28S585 8 610 8H632V125H-26Z" fill="url(#greeting-trend-fill)" /><path d="M-26 86C-16 80 -6 74 3 68C25 50 40 45 60 45S100 52 120 52S160 38 180 38S225 56 245 56S305 25 330 25S385 45 410 45S465 14 485 14S515 28 535 28S585 8 610 8H632" stroke="#ac8544" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /><g fill="#ac8544" stroke="#fff7d9" strokeWidth="2.5">{[[60,45],[120,52],[180,38],[245,56],[330,25],[410,45],[485,14],[535,28]].map(([cx,cy]) => <circle key={cx} cx={cx} cy={cy} r="4.5" />)}</g><circle cx="632" cy="8" r="10" fill="#c99c48" fillOpacity=".14" /><circle cx="632" cy="8" r="6" fill="#ac8544" stroke="#fff7d9" strokeWidth="3" /></svg><HeroDetail variant="home" /><img className="hero-card-art home-card-art" {...heroImage('hero-fox-head')} alt="" aria-hidden="true" /></div><div className="greeting-fox-stage"><img className="greeting-fox" {...heroImage('fox-greeting')} alt="FitSync fox giving a thumbs-up" width={1138} height={1355} fetchPriority="high" /></div><div className="streak"><Flame size={19} fill="currentColor" /><strong>{streak ?? '—'}</strong><span>{streakUnavailable ? 'streak unavailable' : 'day streak'}</span></div></div></div>
    <HomeDashboard onOpen={onOpen} />
  </div>
}

function PlansWorkspace({ tab, setTab, initialMode = 'workout', focusWater = false, initialDate }: { tab: PlanTab; setTab: (tab: PlanTab) => void; initialMode?: 'workout' | 'nutrition'; focusWater?: boolean; initialDate?: string }) {
  const navigation = usePlaylistNavigation()
  const [mode, setModeState] = useState<'nutrition' | 'workout'>(initialMode)
  const setMode = async (next: 'nutrition' | 'workout') => { if (next !== mode && (await navigation?.current() ?? true)) setModeState(next) }
  return <div className="page plans-page plan-workspace"><HeroImagePreloads page="plans" mode={mode} />
    <div className="plan-hero-frame"><div className={`plans-hero plans-mascot-hero ${mode}`}><img className="hero-card-art plan-mode-art" {...heroImage(mode === 'workout' ? 'hero-dumbbell' : 'hero-apple')} alt="" aria-hidden="true" />
      <svg className="plan-hero-lines" viewBox="0 0 1000 300" preserveAspectRatio="none" fill="none" aria-hidden="true">{mode === 'workout' ? <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M-30 62h145c48 0 48 50 96 50h160c48 0 48-50 96-50h150c48 0 48 50 96 50h155c48 0 48-50 96-50h66" /><path d="M-30 82h135c48 0 48 50 96 50h180c48 0 48-50 96-50h130c48 0 48 50 96 50h175c48 0 48-50 96-50h66" /><path d="M-30 218h155c48 0 48-50 96-50h150c48 0 48 50 96 50h165c48 0 48-50 96-50h150c48 0 48 50 96 50h26" /><path d="M-30 238h145c48 0 48-50 96-50h170c48 0 48 50 96 50h145c48 0 48-50 96-50h170c48 0 48 50 96 50h26" /><circle cx="211" cy="112" r="2.5" fill="currentColor" stroke="none" /><circle cx="559" cy="62" r="2.5" fill="currentColor" stroke="none" /><circle cx="755" cy="168" r="2.5" fill="currentColor" stroke="none" /><circle cx="422" cy="218" r="2.5" fill="currentColor" stroke="none" /></g> : <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M-30 92c115 0 115 34 220 34s105-34 210-34 105 34 210 34 105-34 210-34 105 34 210 34 105-34 220-34" /><path d="M-30 112c115 0 115 34 220 34s105-34 210-34 105 34 210 34 105-34 210-34 105 34 210 34 105-34 220-34" /><path d="M-30 208c115 0 115-34 220-34s105 34 210 34 105-34 210-34 105 34 210 34 105-34 210-34 105 34 220 34" /><path d="M-30 228c115 0 115-34 220-34s105 34 210 34 105-34 210-34 105 34 210 34 105-34 210-34 105 34 220 34" /><circle cx="110" cy="122" r="2.5" fill="currentColor" stroke="none" /><circle cx="500" cy="122" r="2.5" fill="currentColor" stroke="none" /><circle cx="890" cy="122" r="2.5" fill="currentColor" stroke="none" /><circle cx="305" cy="180" r="2.5" fill="currentColor" stroke="none" /><circle cx="695" cy="180" r="2.5" fill="currentColor" stroke="none" /></g>}</svg>
      <HeroDetail variant="plans" /><div className="plan-hero-copy"><p className="eyebrow">YOUR PERSONAL PLAN</p><h1>{mode === 'workout' ? <>Train with <span className="plan-title-highlight">Intention</span></> : <>Fuel your <span className="plan-title-highlight">Momentum.</span></>}</h1><p className="muted intro">A clear, flexible week built around your goals.</p><div className={`plan-mode-switch ${mode}`} role="group" aria-label="Plan mode"><button className={mode === 'workout' ? 'active' : ''} aria-pressed={mode === 'workout'} onClick={() => setMode('workout')}><Dumbbell size={15} />Workout</button><button className={mode === 'nutrition' ? 'active' : ''} aria-pressed={mode === 'nutrition'} onClick={() => setMode('nutrition')}><Apple size={15} />Nutrition</button></div></div>
      <div className="plan-hero-mascot"><img {...heroImage(mode === 'workout' ? 'fox-plan-workout' : 'fox-plan-nutrition')} alt={mode === 'workout' ? 'FitSync fox lifting a dumbbell' : 'FitSync fox enjoying an apple'} width="1254" height="1254" /></div>
    </div>
    <div className="plan-tabs" role="tablist" aria-label="Plan sections">{([{ id: 'plan', label: 'My plan', icon: CalendarDays }, { id: 'playlist', label: 'Playlist', icon: Play }, { id: 'library', label: 'Library', icon: BookOpen }] as const).map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)} role="tab" aria-selected={tab === id}><Icon size={16} />{label}</button>)}</div></div>
    <div className="plan-folder-content">{tab === 'plan' ? <MyPlanWorkspace kind={mode} focusWater={focusWater} initialDate={initialDate} /> : tab === 'playlist' ? <PlaylistManager key={mode} kind={mode} /> : mode === 'nutrition' ? <NutritionWorkspace tab="library" setTab={setTab} /> : <LibraryView />}</div>
  </div>
}

function LibraryView() { return <ExerciseLibrary /> }

function SocialHeroArtwork() {
  return <div className="social-hero-art" aria-hidden="true">
    <img className="social-world" {...heroImage('social-connected-earth')} width="1408" height="1120" alt="" />
    <svg className="social-phone-signal" viewBox="0 0 180 120" fill="none">
      <defs><filter id="social-signal-glow"><feGaussianBlur stdDeviation="3" /></filter></defs>
      <g stroke="#ffe58a" strokeWidth="8" filter="url(#social-signal-glow)" opacity=".8"><path d="M145 101Q118 81 126 55M127 104Q91 73 108 38M109 108Q65 65 91 20" /></g>
      <g stroke="#fffbea" strokeWidth="2.5" strokeLinecap="round"><path d="M145 101Q118 81 126 55M127 104Q91 73 108 38M109 108Q65 65 91 20" /></g>
    </svg>
    <img className="social-phone-fox" {...heroImage('fox-social-phone')} width="1254" height="1254" alt="" />
  </div>
}
function SocialView({ initialSection, initialPostId }: { initialSection?: 'forum' | 'people' | 'gym'; initialPostId?: string }) {
  const [selectedDate, setSelectedDate] = useState('')
  return <div className="page social-page social-flow"><HeroImagePreloads page="social" /><div className="social-hero-frame"><div className="social-hero-card"><HeroDetail variant="social" /><img className="hero-card-art social-card-art" {...heroImage('hero-social-phone')} alt="" aria-hidden="true" /><svg className="social-hero-line-art" viewBox="0 0 800 350" preserveAspectRatio="none" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth=".9"><path d="M0 58H170Q196 58 210 78L244 126Q258 146 286 146H800"/><path d="M0 74H160Q184 74 198 94L232 142Q246 162 274 162H800"/><path d="M0 90H150Q172 90 186 110L220 158Q234 178 262 178H800"/><path d="M0 286H200Q228 286 246 264L302 204Q320 186 348 186H800"/><path d="M0 302H212Q240 302 258 280L314 220Q332 202 360 202H800"/><path d="M0 318H224Q252 318 270 296L326 236Q344 218 372 218H800"/></g></svg><SocialHeroArtwork /><div className="social-intro"><div><p className="eyebrow">A LITTLE SUPPORT. SHARED PROGRESS.</p><h1>Your support<br/><span className="plan-title-highlight">circle</span></h1><p className="muted intro">A place to ask, share, and keep showing <span className="social-subtitle-ending">up together.</span></p></div><div className="community-orb" aria-hidden="true"><Users size={27} /></div></div></div><aside className="social-connection-card"><Users size={24} aria-hidden="true" /><p>GLOBAL CONNECTION</p><strong>Together</strong><span>Share. Connect. Grow.</span></aside></div>
    <SocialWorkspace initialSection={initialSection} initialPostId={initialPostId}/>
  </div>
}


function MoonIcon() { return <span className="tiny-icon">☾</span> } function DownloadIcon() { return <span className="tiny-icon">↓</span> }

export default function Dashboard({ profile, accountId = null, dataEpoch = 0, ...props }: { userName: string; userEmail: string; accountId?: string | null; dataEpoch?: number; profile: OnboardingProfile }) {
  return <PlaylistAccountProvider id={accountId} dataEpoch={dataEpoch} timeZone={profile.timeZone}><PlaylistNavigationProvider><PlanningProfileProvider profile={profile}><NotificationProvider><App {...props} /></NotificationProvider></PlanningProfileProvider></PlaylistNavigationProvider></PlaylistAccountProvider>
}
