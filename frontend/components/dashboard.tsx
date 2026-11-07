'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CoachChat } from '@/components/coach-chat'
import { Wordmark } from '@/components/wordmark'
import { PlaylistAccountProvider } from '@/lib/playlist-account'
import { PlaylistNavigationProvider, usePlaylistNavigation } from '@/lib/playlist-navigation'
import { PlaylistManager } from '@/components/playlist-manager'
import { NutritionWorkspace } from '@/components/nutrition-workspace'
import { MyPlanWorkspace } from '@/components/my-plan-workspace'
import { ExerciseLibrary } from '@/components/exercise-library'
import { PlanningProfileProvider } from '@/lib/planning-profile'
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
  const navigation = usePlaylistNavigation()
  const [active, setActiveState] = useState<Section>('home')
  const [planTab, setPlanTabState] = useState<PlanTab>('plan')
  const setActive = (section: Section) => { if (section !== active && (navigation?.current() ?? true)) setActiveState(section) }
  const setPlanTab = (tab: PlanTab) => { if (tab !== planTab && (navigation?.current() ?? true)) setPlanTabState(tab) }
  const [water, setWater] = useState(4)
  const [done, setDone] = useState<string[]>([])

  const [navOpen, setNavOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const [focusMode, setFocusMode] = useState(false)
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

  const toggleDone = (item: string) => setDone((current) => current.includes(item) ? current.filter((x) => x !== item) : [...current, item])

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

        {active === 'home' && <HomeView displayName={firstName} water={water} setWater={setWater} done={done} toggleDone={toggleDone} onNavigate={setActive} focusMode={focusMode} setFocusMode={setFocusMode} />}
        {active === 'plans' && <PlansWorkspace tab={planTab} setTab={setPlanTab} />}
        {active === 'library' && <LibraryView />}
        {active === 'social' && <SocialView />}
        {active === 'progress' && <ProgressWorkspace />}
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

function HomeView({ displayName, water, setWater, done, toggleDone, onNavigate, focusMode, setFocusMode }: { displayName: string; water: number; setWater: (v: number) => void; done: string[]; toggleDone: (s: string) => void; onNavigate: (s: Section) => void; focusMode: boolean; setFocusMode: (value: boolean) => void }) {
  const dailyWins = ['Lower body strength', 'Greek yogurt parfait'].filter((item) => done.includes(item)).length
  return <div className={`page home-page ${focusMode ? 'focus-mode' : ''}`}><div className="ambient-shape shape-one" aria-hidden="true" /><div className="ambient-shape shape-two" aria-hidden="true" /><div className="home-greeting-frame"><div className="greeting greeting-with-mascot"><div className="greeting-copy"><p className="eyebrow">Tuesday, September 30</p><h1><span className="greeting-title-line"><span className="greeting-salutation">Good morning,</span> <span className="greeting-name">{displayName} <Sparkles className="greeting-spark" size={18} /></span></span><span className="greeting-title-line greeting-progress-line">today is for <span className="greeting-progress">Progress</span></span></h1><p className="muted">Every small step is a huge leap tommorow.</p><svg className="greeting-trend-art" viewBox="-88 -3 728 82" preserveAspectRatio="none" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id="greeting-trend-fill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="125"><stop stopColor="#b28b46" stopOpacity=".28" /><stop offset=".55" stopColor="#bc8e37" stopOpacity=".13" /><stop offset="1" stopColor="#bc8e37" stopOpacity="0" /></linearGradient></defs><g fill="#70603c" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="400" textAnchor="start">{[[8,"80 units"],[28,"50 units"],[48,"20 units"],[68,"0 units"]].map(([y,label]) => <text key={label} x="-84" y={Number(y) + 4}>{label}</text>)}</g><g stroke="#a88a49" strokeOpacity=".48" strokeWidth="1.2" strokeDasharray="4 4">{[8, 28, 48, 68].map((y) => <path key={y} d={`M-26 ${y}H637`} />)}</g><path d="M-26 86C-16 80 -6 74 3 68C25 50 40 45 60 45S100 52 120 52S160 38 180 38S225 56 245 56S305 25 330 25S385 45 410 45S465 14 485 14S515 28 535 28S585 8 610 8H632V125H-26Z" fill="url(#greeting-trend-fill)" /><path d="M-26 86C-16 80 -6 74 3 68C25 50 40 45 60 45S100 52 120 52S160 38 180 38S225 56 245 56S305 25 330 25S385 45 410 45S465 14 485 14S515 28 535 28S585 8 610 8H632" stroke="#ac8544" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /><g fill="#ac8544" stroke="#fff7d9" strokeWidth="2.5">{[[60,45],[120,52],[180,38],[245,56],[330,25],[410,45],[485,14],[535,28]].map(([cx,cy]) => <circle key={cx} cx={cx} cy={cy} r="4.5" />)}</g><circle cx="632" cy="8" r="10" fill="#c99c48" fillOpacity=".14" /><circle cx="632" cy="8" r="6" fill="#ac8544" stroke="#fff7d9" strokeWidth="3" /></svg></div><div className="greeting-fox-stage"><img className="greeting-fox" src="/mascot/fox-greeting.png" alt="FitSync fox giving a thumbs-up" width={1138} height={1355} fetchPriority="high" /></div><div className="streak"><Flame size={19} fill="currentColor" /><strong>12</strong><span>day streak</span></div></div></div>
    <div className="hero-card"><div><p className="eyebrow light">YOUR DAILY FOCUS</p><h2>Move with intention.</h2><p>Complete your plan to keep your momentum going.</p><button className="light-button" onClick={() => onNavigate('plans')}>View today&apos;s plan <ArrowRight size={15} /></button></div><button className={`hero-orb ${focusMode ? 'is-focused' : ''}`} onClick={() => setFocusMode(!focusMode)} aria-pressed={focusMode} aria-label={focusMode ? 'Turn off focus mode' : 'Start focus mode'}><Dumbbell size={43} /><span>{focusMode ? 'Locked in' : 'Tap to focus'}</span></button></div>
    <div className="daily-momentum"><div className="momentum-mascot" aria-hidden="true"><Logo /><span><Zap size={15} fill="currentColor" /></span></div><div className="momentum-copy"><p className="eyebrow">TODAY'S MOMENTUM</p><h2>Small wins. Big energy.</h2><p>Move a little. Fuel well. Make it yours.</p></div><div className="momentum-score"><strong>{dailyWins}<span> / 2</span></strong><span>daily wins</span><progress value={dailyWins} max={2} aria-label="Daily plan completion" /></div></div>
    <div className="section-heading"><h2>Today at a glance</h2><button onClick={() => onNavigate('progress')}>See progress <ArrowRight size={15} /></button></div>
    <div className="stats-grid"><div className="stat-card"><div className="stat-icon peach"><Flame size={18} /></div><strong>1,240</strong><span>kcal remaining</span><div className="progress-line"><i style={{ width: '46%' }} /></div></div><div className="stat-card"><div className="stat-icon mint"><Dumbbell size={18} /></div><strong>24 <small>min</small></strong><span>movement today</span><div className="progress-line mint-line"><i style={{ width: '65%' }} /></div></div><div className="stat-card water-card"><div className="stat-icon blue"><Activity size={18} /></div><strong>{water}<small>/ 8 glasses</small></strong><span>water tracker</span><button className="water-add" onClick={() => setWater(water >= 8 ? 0 : water + 1)}><Plus size={14} />Add glass</button></div></div>
    <div className="section-heading"><h2>Tuesday&apos;s plan</h2><button onClick={() => onNavigate('plans')}>Full schedule <ArrowRight size={15} /></button></div>
    <div className="plan-list">{[{ title: 'Lower body strength', meta: 'Workout · 28 min · Beginner', icon: Dumbbell, tone: 'peach' }, { title: 'Greek yogurt parfait', meta: 'Breakfast · 380 kcal', icon: Utensils, tone: 'mint' }].map((item) => <div className="plan-row" key={item.title}><div className={`row-icon ${item.tone}`}><item.icon size={19} /></div><div className="row-copy"><strong>{item.title}</strong><span>{item.meta}</span></div><button className={`check ${done.includes(item.title) ? 'checked' : ''}`} onClick={() => toggleDone(item.title)}>{done.includes(item.title) ? <Check size={16} /> : <span />}</button></div>)}</div>
    <div className="section-heading"><h2>Explore <Wordmark /></h2></div><div className="explore-grid"><button onClick={() => onNavigate('social')}><MessageCircle size={20} /><strong>Ask AI coach</strong><span>Personalized answers</span></button><button onClick={() => onNavigate('library')}><BookOpen size={20} /><strong>Browse library</strong><span>Find your next move</span></button><button onClick={() => onNavigate('progress')}><Trophy size={20} /><strong>Progress log</strong><span>Celebrate your wins</span></button></div>
  </div>
}

function PlansWorkspace({ tab, setTab }: { tab: PlanTab; setTab: (tab: PlanTab) => void }) {
  const navigation = usePlaylistNavigation()
  const [mode, setModeState] = useState<'nutrition' | 'workout'>('workout')
  const setMode = (next: 'nutrition' | 'workout') => { if (next !== mode && (navigation?.current() ?? true)) setModeState(next) }
  return <div className="page plans-page plan-workspace">
    <div className="plan-hero-frame"><div className="plans-hero plans-mascot-hero">
      <svg className="plan-hero-lines" viewBox="0 0 600 240" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1">{[0, 18, 36, 54, 72].map(offset => <path key={offset} d={`M${40 + offset} 0L${140 + offset} 88Q${152 + offset} 100 ${172 + offset} 100H${320 + offset}Q${340 + offset} 100 ${352 + offset} 88L${450 + offset} 0M${40 + offset} 240L${140 + offset} 152Q${152 + offset} 140 ${172 + offset} 140H${320 + offset}Q${340 + offset} 140 ${352 + offset} 152L${450 + offset} 240`} />)}</g></svg>
      <div className="plan-hero-copy"><p className="eyebrow">YOUR PERSONAL PLAN</p><h1>{mode === 'workout' ? <>Train with <span className="plan-title-highlight">Intention</span></> : <>Fuel your <span className="plan-title-highlight">Momentum.</span></>}</h1><p className="muted intro">A clear, flexible week built around your goals.</p></div>
      <div className="plan-hero-mascot"><img src={mode === 'workout' ? '/mascot/fox-plan-workout.png' : '/mascot/fox-plan-nutrition.png'} alt={mode === 'workout' ? 'FitSync fox lifting a dumbbell' : 'FitSync fox enjoying an apple'} width="1254" height="1254" /></div>
      <div className={`plan-mode-switch ${mode}`} role="group" aria-label="Plan mode"><button className={mode === 'workout' ? 'active' : ''} aria-pressed={mode === 'workout'} onClick={() => setMode('workout')}><Dumbbell size={15} />Workout</button><button className={mode === 'nutrition' ? 'active' : ''} aria-pressed={mode === 'nutrition'} onClick={() => setMode('nutrition')}><Apple size={15} />Nutrition</button></div>
    </div>
    <div className="plan-tabs" role="tablist" aria-label="Plan sections">{([{ id: 'plan', label: mode === 'nutrition' ? 'My meal plan' : 'My plan', icon: CalendarDays }, { id: 'playlist', label: 'Playlist', icon: Play }, { id: 'library', label: mode === 'nutrition' ? 'Food library' : 'Library', icon: BookOpen }] as const).map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)} role="tab" aria-selected={tab === id}><Icon size={16} />{label}</button>)}</div></div>
    <div className="plan-folder-content">{tab === 'plan' ? <MyPlanWorkspace kind={mode} /> : tab === 'playlist' ? <PlaylistManager key={mode} kind={mode} /> : mode === 'nutrition' ? <NutritionWorkspace tab="library" setTab={setTab} /> : <LibraryView />}</div>
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
function SocialView() {
  const [post, setPost] = useState('')
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const [selectedDate, setSelectedDate] = useState(today)
  const [posts, setPosts] = useState([{ body: 'Finished my first full week of strength training. Feeling stronger already.', date: today }])
  const visiblePosts = posts.filter((item) => item.date === selectedDate)
  const [gymSearch, setGymSearch] = useState('')
  const [connected, setConnected] = useState<string[]>([])
  const [gymPostOpen, setGymPostOpen] = useState(false)
  const [newGym, setNewGym] = useState({ name: '', location: '' })
  const [postedGyms, setPostedGyms] = useState<{ name: string; location: string; rating: string }[]>([])
  const [likedPosts, setLikedPosts] = useState<number[]>([])
  const [notice, setNotice] = useState('')
  const [activeSection, setActiveSection] = useState<'feed' | 'people' | 'gyms' | null>(null)
  const gyms = [...postedGyms, { name: 'Pulse Studio', location: 'Downtown · 0.8 mi', rating: '4.8' }, { name: 'Northside Strength', location: 'Northside · 1.4 mi', rating: '4.6' }, { name: 'Flow & Form', location: 'Riverside · 2.1 mi', rating: '4.9' }]
  const people = ['Maya · Nutritionist', 'Alex · Fitness instructor', 'Chris · Gym buddy']
  const filteredGyms = gyms.filter((gym) => `${gym.name} ${gym.location}`.toLowerCase().includes(gymSearch.toLowerCase()))
  const getCurrentUser = async () => {
    if (!supabase) return null
    const { data } = await supabase.auth.getUser()
    return data.user
  }
  const publishPost = async () => {
    const body = post.trim()
    if (!body) return
    setPosts([{ body, date: selectedDate }, ...posts]); setPost('')
    const user = await getCurrentUser()
    if (!user) { setNotice('Sign in to publish this post'); return }
    const { error } = await supabase!.from('social_posts').insert({ author_id: user.id, kind: 'forum', body })
    setNotice(error ? 'Post preview saved locally' : 'Post published to the community')
  }
  const toggleLike = async (index: number) => {
    const nextLiked = !likedPosts.includes(index)
    setLikedPosts((items) => nextLiked ? [...items, index] : items.filter((item) => item !== index))
    const user = await getCurrentUser()
    if (!user) return setNotice('Sign in to save likes')
    const postId = `preview-${index}`
    const result = nextLiked
      ? await supabase!.from('social_likes').insert({ post_id: postId, user_id: user.id })
      : await supabase!.from('social_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    if (result.error) setNotice('Like preview updated')
  }
  const publishGym = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newGym.name.trim() || !newGym.location.trim()) return
    const gym = { name: newGym.name.trim(), location: newGym.location.trim(), rating: 'New' }
    setPostedGyms([gym, ...postedGyms]); setNewGym({ name: '', location: '' }); setGymPostOpen(false)
    const user = await getCurrentUser()
    if (!user) { setNotice('Sign in to publish this gym'); return }
    const { error } = await supabase!.from('gyms').insert({ author_id: user.id, name: gym.name, location: gym.location })
    setNotice(error ? 'Gym preview saved locally' : 'Gym published to the community')
  }
  return <div className="page social-page social-flow"><div className="social-hero-frame"><div className="social-hero-card"><svg className="social-hero-line-art" viewBox="0 0 800 350" preserveAspectRatio="none" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth=".9"><path d="M0 58H170Q196 58 210 78L244 126Q258 146 286 146H800"/><path d="M0 74H160Q184 74 198 94L232 142Q246 162 274 162H800"/><path d="M0 90H150Q172 90 186 110L220 158Q234 178 262 178H800"/><path d="M0 286H200Q228 286 246 264L302 204Q320 186 348 186H800"/><path d="M0 302H212Q240 302 258 280L314 220Q332 202 360 202H800"/><path d="M0 318H224Q252 318 270 296L326 236Q344 218 372 218H800"/></g></svg><SocialHeroArtwork /><div className="social-intro"><div><p className="eyebrow">COMMUNITY · 12,840 MEMBERS</p><h1>Your support <span className="plan-title-highlight">circle</span></h1><p className="muted intro">A place to ask, share, and keep showing <span className="social-subtitle-ending">up together.</span></p></div><div className="community-orb" aria-hidden="true"><Users size={27} /></div></div><div className="social-date-filter"><label htmlFor="social-date">Show posts for:</label><input id="social-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></div></div><aside className="social-connection-card"><Users size={24} aria-hidden="true" /><p>GLOBAL CONNECTION</p><strong>12,840</strong><span>community members</span></aside></div>
    {activeSection && <section className="social-detail-view"><button className="social-back-button" onClick={() => setActiveSection(null)}><ChevronRight size={16} /> Back to community</button>{activeSection === 'feed' && <><div className="detail-heading"><p className="eyebrow">COMMUNITY PULSE</p><h2>Small wins, shared</h2><span>{visiblePosts.length} posts on this date</span></div><div className="detail-compose compose-row"><div className="avatar small">JD</div><input value={post} onChange={(event) => setPost(event.target.value)} placeholder="Share a thought" /><button onClick={publishPost} aria-label="Publish post"><Plus size={18} /></button></div><div className="detail-post-list">{visiblePosts.map((item, index) => <article className="community-post" key={`${item}-${index}`}><div className="post-head"><div className="avatar small">{index ? 'SK' : 'JD'}</div><div><strong>{index ? 'Sam K.' : 'Jamie Davis'}</strong><span>{index ? '2h ago · Workout wins' : 'Just now · Community'}</span></div><MoreHorizontal size={18} /></div><p>{item.body}</p><div className="post-actions"><button className={likedPosts.includes(index) ? 'is-liked' : ''} onClick={() => toggleLike(index)}><HeartPulse size={15} /> {Number(index ? 24 : 1) + (likedPosts.includes(index) ? 1 : 0)}</button><button onClick={() => setNotice('Comments preview opened')}><MessageCircle size={15} /> Comment</button></div></article>)}</div></>}{activeSection === 'people' && <><div className="detail-heading"><p className="eyebrow">YOUR PEOPLE</p><h2>Find your rhythm</h2><span>Connect with people who get it.</span></div><div className="detail-compose compose-row"><div className="avatar small">JD</div><input value={post} onChange={(event) => setPost(event.target.value)} placeholder="Share a goal" /><button onClick={publishPost} aria-label="Post a goal"><Plus size={18} /></button></div><div className="people-detail-grid">{people.map((person, index) => <article key={person}><div className={`person-avatar person-${index}`}>{person[0]}</div><strong>{person}</strong><span>{index === 0 ? 'Meal prep · Mindful eating' : index === 1 ? 'Strength · Mobility' : 'Early morning training'}</span><button onClick={() => setConnected((items) => items.includes(person) ? items.filter((item) => item !== person) : [...items, person])}>{connected.includes(person) ? 'Connected' : 'Connect'} <ArrowRight size={14} /></button></article>)}</div></>}{activeSection === 'gyms' && <><div className="detail-heading"><p className="eyebrow">NEARBY</p><h2>Move together IRL</h2><span>Find a place to keep moving.</span></div><section className="social-gyms-card"><div className="gym-tools"><div className="tab-search"><Search size={17} /><input aria-label="Search gyms near you" value={gymSearch} onChange={(event) => setGymSearch(event.target.value)} placeholder="Search gym" /><span><MapPin size={13} /> GPS on</span></div><button className="post-gym-button" onClick={() => setGymPostOpen(!gymPostOpen)}><Plus size={15} /> Post a gym</button></div>{gymPostOpen && <form className="gym-post-form" onSubmit={publishGym}><input aria-label="Gym name" required value={newGym.name} onChange={(event) => setNewGym({ ...newGym, name: event.target.value })} placeholder="Gym name" /><input aria-label="Gym location" required value={newGym.location} onChange={(event) => setNewGym({ ...newGym, location: event.target.value })} placeholder="Neighborhood or address" /><button type="submit">Publish gym</button></form>}<div className="gym-list">{filteredGyms.map((gym) => <article key={`${gym.name}-${gym.location}`} onClick={() => setNotice(`${gym.name} details preview`)} role="button" tabIndex={0}><div className="gym-photo"><Dumbbell size={22} /></div><div><strong>{gym.name}</strong><span>{gym.location}</span><small>{gym.rating === 'New' ? 'Just added · Community post' : `★ ${gym.rating} · Open now`}</small></div><ArrowRight size={17} /></article>)}</div></section></>}{notice && <button className="social-notice" onClick={() => setNotice('')}>{notice} <X size={13} /></button>}</section>}
    <div className={`social-main-sections ${activeSection ? 'is-hidden' : ''}`}><div className="social-section-title"><button className="social-section-link" onClick={() => setActiveSection('feed')}><div className="social-title-copy"><p className="eyebrow">COMMUNITY PULSE</p><div className="social-title-row"><h2>Small wins, shared</h2><MessageCircle size={20} /></div></div><span className="social-arrow-more"><ArrowRight size={16} /><small>See more</small></span></button></div><section className="social-feed-card"><div className="community-posts" aria-label="Community posts">{visiblePosts.slice(0, 1).map((item, index) => <article className="community-post" key={`${item}-${index}`}><div className="post-head"><div className="avatar small">{index ? 'SK' : 'JD'}</div><div><strong>{index ? 'Sam K.' : 'Jamie Davis'}</strong><span>{index ? '2h ago · Workout wins' : 'Just now · Community'}</span></div><MoreHorizontal size={18} /></div><p>{item.body}</p><div className="post-actions"><button className={likedPosts.includes(index) ? 'is-liked' : ''} onClick={() => toggleLike(index)}><HeartPulse size={15} /> {Number(index ? 24 : 1) + (likedPosts.includes(index) ? 1 : 0)}</button><button onClick={() => { setNotice('Comments preview opened'); setPost(`Comment on ${index ? 'Sam’s' : 'your'} post`) }}><MessageCircle size={15} /> Comment</button></div></article>)}</div><p className="feed-scroll-hint"><ArrowRight size={13} /> Swipe to explore more posts</p></section>
    <div className="social-section-title"><button className="social-section-link" onClick={() => setActiveSection('people')}><div className="social-title-copy"><p className="eyebrow">YOUR PEOPLE</p><div className="social-title-row"><h2>Find your rhythm</h2><Users size={20} /></div></div><span className="social-arrow-more"><ArrowRight size={16} /><small>See more</small></span></button></div><section className="people-card-shell"><div className="people-strip">{people.map((person, index) => <article key={person}><div className={`person-avatar person-${index}`}>{person[0]}</div><strong>{person}</strong><span>{index === 0 ? 'Meal prep · Mindful eating' : index === 1 ? 'Strength · Mobility' : 'Early morning training'}</span><button onClick={() => setConnected((items) => items.includes(person) ? items.filter((item) => item !== person) : [...items, person])}>{connected.includes(person) ? 'Connected' : 'Connect'} <ArrowRight size={14} /></button></article>)}</div></section>
    <div className="social-section-title"><button className="social-section-link" onClick={() => setActiveSection('gyms')}><div className="social-title-copy"><p className="eyebrow">NEARBY</p><div className="social-title-row"><h2>Move together IRL</h2><MapPin size={20} /></div></div><span className="social-arrow-more"><ArrowRight size={16} /><small>See more</small></span></button></div><section className="social-gyms-card"><div className="gym-list">{filteredGyms.map((gym) => <article key={`${gym.name}-${gym.location}`} onClick={() => setNotice(`${gym.name} details preview`)} role="button" tabIndex={0}><div className="gym-photo"><Dumbbell size={22} /></div><div><strong>{gym.name}</strong><span>{gym.location}</span><small>{gym.rating === 'New' ? 'Just added · Community post' : `★ ${gym.rating} · Open now`}</small></div><ArrowRight size={17} /></article>)}</div></section>{notice && <button className="social-notice" onClick={() => setNotice('')}>{notice} <X size={13} /></button>}</div><section className={`social-coach-feature ${activeSection ? 'is-hidden' : ''}`}><div className="social-panel-heading"><div className="coach-avatar"><Sparkles size={24} /></div><div><strong>AI Chatbot</strong><span>Chat for personalized guidance</span></div><i>Online</i></div><CoachChat /></section>
  </div>
}


function SettingsView({ userName, userEmail, initials }: { userName: string; userEmail: string; initials: string }) { return <div className="page"><p className="eyebrow">ACCOUNT</p><h1>Settings</h1><p className="muted intro">Make <Wordmark /> work for you.</p><div className="settings-profile"><div className="avatar">{initials}</div><div><strong>{userName}</strong><span>{userEmail}</span></div><button>Edit</button></div><div className="settings-group"><p>Preferences</p><button onClick={() => window.location.assign('/onboarding')}><span><Flag size={17} />Goals &amp; planning preferences</span><small>Edit <ChevronRight size={16} /></small></button><button><span><Sparkles size={17} />Notifications</span><small>On <ChevronRight size={16} /></small></button><div className="default-theme-setting"><div><Palette size={17} /><span>Theme</span></div><div className="default-theme-preview"><span className="theme-colors" aria-hidden="true"><i /><i /><i /></span><strong>Fox Energy</strong><small>Default</small><Check size={15} /></div><p>Vibrant, sporty daytime. Built for your next move.</p></div><button><span><MapPin size={17} />Offline mode</span><small>Off <ChevronRight size={16} /></small></button></div><div className="settings-group"><p>Data & account</p><button><span><DownloadIcon />Export your data</span><ChevronRight size={16} /></button><button><span><UserRound size={17} />Contact the team</span><ChevronRight size={16} /></button></div><PlanSignout /></div> }
function MoonIcon() { return <span className="tiny-icon">☾</span> } function DownloadIcon() { return <span className="tiny-icon">↓</span> }

export default function Dashboard({ profile, accountId = null, ...props }: { userName: string; userEmail: string; accountId?: string | null; profile: OnboardingProfile }) {
  return <PlaylistAccountProvider id={accountId} timeZone={profile.timeZone}><PlaylistNavigationProvider><PlanningProfileProvider profile={profile}><App {...props} /></PlanningProfileProvider></PlaylistNavigationProvider></PlaylistAccountProvider>
}
