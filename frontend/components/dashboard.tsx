'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CoachChat } from '@/components/coach-chat'
import { Wordmark } from '@/components/wordmark'
import '@/app/coach-chat.css'
import { signOut } from '@/app/auth/actions'
import {
  Activity,
  Apple,
  ArrowRight,
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
  const [active, setActive] = useState<Section>('home')
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
        {active === 'plans' && <PlansWorkspace done={done} toggleDone={toggleDone} />}
        {active === 'library' && <LibraryView />}
        {active === 'social' && <SocialView />}
        {active === 'progress' && <ProgressView />}
        {active === 'settings' && <SettingsView userName={userName} userEmail={userEmail} initials={initials} />}
      </section>

      <nav className={`mobile-nav${navHidden ? ' nav-hidden' : ''}`} aria-label="Bottom navigation" aria-hidden={navHidden} inert={navOpen || navHidden}>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => setActive(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>

    </main>
  )
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

function PlansWorkspace({ done, toggleDone }: { done: string[]; toggleDone: (s: string) => void }) {
  const [mode, setMode] = useState<'nutrition' | 'workout'>('workout')
  const [tab, setTab] = useState<'plan' | 'playlist' | 'library'>('plan')
  const [day, setDay] = useState(2)
  const [saved, setSaved] = useState(false)
  const [tabSearch, setTabSearch] = useState('')
  const [water, setWater] = useState(4)
  const [itemTimes, setItemTimes] = useState<Record<string, string>>({})
  const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const workoutItems = [
    { title: 'Lower body strength', meta: '28 min · Beginner', icon: Dumbbell, tone: 'peach' },
    { title: 'Core & mobility flow', meta: '18 min · All levels', icon: Activity, tone: 'lavender' },
    { title: 'Low-impact full body', meta: '24 min · Beginner', icon: Zap, tone: 'mint' },
  ]
  const nutritionItems = meals.map((meal) => ({ title: meal.name, meta: meal.meta, icon: meal.icon, tone: meal.color }))
  const items = mode === 'workout' ? workoutItems : nutritionItems
  const filteredItems = items.filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(tabSearch.toLowerCase().trim()))
  const completed = (title: string) => done.includes(title)
  return <div className="page plans-page plan-workspace">
    <div className="plans-hero plans-mascot-hero">
      <svg className="plan-hero-lines" viewBox="0 0 600 240" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1">{[0, 18, 36, 54, 72].map(offset => <path key={offset} d={`M${40 + offset} 0L${140 + offset} 88Q${152 + offset} 100 ${172 + offset} 100H${320 + offset}Q${340 + offset} 100 ${352 + offset} 88L${450 + offset} 0M${40 + offset} 240L${140 + offset} 152Q${152 + offset} 140 ${172 + offset} 140H${320 + offset}Q${340 + offset} 140 ${352 + offset} 152L${450 + offset} 240`} />)}</g><g fill="currentColor"><circle cx="112" cy="64" r="3"/><circle cx="520" cy="46" r="3"/><circle cx="94" cy="192" r="3"/></g></svg>
      <div className="plan-hero-copy"><p className="eyebrow">YOUR PERSONAL PLAN</p><h1>{mode === 'workout' ? 'Train with intention.' : 'Fuel your momentum.'}</h1><p className="muted intro">A clear, flexible week built around your goals.</p></div>
      <div className="plan-hero-mascot"><img src={mode === 'workout' ? '/mascot/fox-plan-workout.png' : '/mascot/fox-plan-nutrition.png'} alt={mode === 'workout' ? 'FitSync fox lifting a dumbbell' : 'FitSync fox enjoying an apple'} width="1254" height="1254" /></div>
      <div className={`plan-mode-switch ${mode}`} role="group" aria-label="Plan mode"><button className={mode === 'workout' ? 'active' : ''} aria-pressed={mode === 'workout'} onClick={() => setMode('workout')}><Dumbbell size={15} />Workout</button><button className={mode === 'nutrition' ? 'active' : ''} aria-pressed={mode === 'nutrition'} onClick={() => setMode('nutrition')}><Apple size={15} />Nutrition</button></div>
    </div>
    <div className="plan-tabs" role="tablist" aria-label="Plan sections">{([{ id: 'plan', label: 'My plan', icon: CalendarDays }, { id: 'playlist', label: 'Playlist', icon: Play }, { id: 'library', label: 'Library', icon: BookOpen }] as const).map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)} role="tab" aria-selected={tab === id}><Icon size={16} />{label}</button>)}</div>
    <div className="plan-folder-content">{tab === 'plan' && <>
      <div className="plan-summary"><div className="plan-summary-top"><div className="ai-badge"><Sparkles size={16} />AI COACHED</div><span className="plan-status"><Check size={13} /> {mode === 'workout' ? '3 sessions' : '4 meals'} planned</span></div><h2>{mode === 'workout' ? 'A stronger week starts here.' : 'Balanced fuel, made simple.'}</h2><p>{mode === 'workout' ? '70 min planned · Recovery-aware · Beginner friendly' : '1,840 kcal · 128g protein · 210g carbs · 58g fat'}</p><div className="plan-progress"><span style={{ width: mode === 'workout' ? '38%' : '52%' }} /></div><small>{mode === 'workout' ? '1 of 3 sessions complete' : '2 of 4 meals complete'}</small></div>
      <div className="plan-section-header"><div><p className="eyebrow">WEEK AT A GLANCE</p><h2>Choose a day</h2></div><button className="outline-action"><DownloadIcon />Export week</button></div><div className="week-row plan-week">{week.map((name, index) => <button key={name} className={day === index ? 'today' : ''} onClick={() => setDay(index)}><span>{name}</span><strong>{index + 1}</strong><small>{index === day ? 'Today' : index < day ? 'Done' : 'Open'}</small></button>)}</div>
      <div className="plan-section-header"><div><p className="eyebrow">{week[day].toUpperCase()} FOCUS</p><h2>{mode === 'workout' ? "Today's movement" : "Today's nourishment"}</h2></div><button className="text-action" onClick={() => setSaved(!saved)}>{saved ? 'Saved' : 'Save week'} <Check size={15} /></button></div>
      <div className="plan-items timeline-items">{items.map((item, index) => <article className={`plan-item timeline-item ${completed(item.title) ? 'is-complete' : ''}`} key={item.title}><div className="timeline-rail" aria-hidden="true"><span className="timeline-dot" />{index === items.length - 1 && <Flag size={15} className="timeline-flag" />}</div><div className={`plan-item-icon ${item.tone}`}><item.icon size={21} /></div><div className="plan-item-copy"><div><label className="time-editor"><span>{itemTimes[item.title] || `${index + 8}:00`}</span><input type="time" aria-label={`Set time for ${item.title}`} value={itemTimes[item.title] || `${String(index + 8).padStart(2, '0')}:00`} onChange={(event) => setItemTimes({ ...itemTimes, [item.title]: event.target.value })} /></label><strong>{item.title}</strong><span>{item.meta}</span></div><button className={`round-check ${completed(item.title) ? 'checked' : ''}`} onClick={() => toggleDone(item.title)} aria-label={`${completed(item.title) ? 'Undo' : 'Mark'} ${item.title} complete`}>{completed(item.title) ? <Check size={15} /> : <span />}</button></div><div className="plan-item-actions"><button onClick={() => toggleDone(item.title)}>{completed(item.title) ? 'Completed' : 'Mark done'}</button><button>Swap</button><button onClick={() => setSaved(true)}>Save</button></div></article>)}</div>
      <div className="plan-bottom-grid"><div className="recovery-card"><div className="card-icon"><HeartPulse size={19} /></div><div><p className="eyebrow">RECOVERY NOTE</p><h3>{mode === 'workout' ? 'Rest is part of training.' : 'Hydration supports every goal.'}</h3><p>{mode === 'workout' ? 'Take a slower day when your body asks for it. Light mobility still counts.' : 'Track your water throughout the day and keep your energy steady.'}</p></div></div><div className="water-card-plan"><div className="water-check-heading"><div><p className="eyebrow">WATER CHECK</p><strong>{water} / 8 glasses</strong><span className="water-hint">Tap a droplet to log water</span></div></div><div className="water-droplets" role="group" aria-label="Water glasses"><div className="water-droplet-grid">{Array.from({ length: 8 }, (_, index) => <button key={index} className={`water-droplet ${index < water ? 'filled' : ''}`} onClick={() => setWater(index < water ? index : index + 1)} aria-label={`${index < water ? 'Remove' : 'Mark'} glass ${index + 1}`} aria-pressed={index < water}><Droplet size={22} fill="currentColor" /><span className="sr-only">{index + 1}</span></button>)}</div></div></div></div>
    </>}
    {tab === 'playlist' && <div className="tab-content"><div className="tab-search"><Search size={17} /><input aria-label="Search playlist" value={tabSearch} onChange={(event) => setTabSearch(event.target.value)} placeholder="Search your playlist..." /><span>{filteredItems.length} matches</span></div>{tabSearch ? <div className="plan-library-grid">{filteredItems.map((item) => <div className="plan-library-card" key={item.title}><div className={`plan-item-icon ${item.tone}`}><item.icon size={20} /></div><strong>{item.title}</strong><span>{item.meta}</span><button onClick={() => toggleDone(item.title)}>{completed(item.title) ? 'Completed' : 'Mark done'}</button></div>)}</div> : <div className="empty-plan-state"><div className="state-icon"><Play size={24} /></div><p className="eyebrow">YOUR PLAYLIST</p><h2>{saved ? 'Week saved offline.' : 'Build your rhythm.'}</h2><p className="muted">Save a full week or add favorites from the library. Your choices stay ready when you are.</p><button className="primary" onClick={() => setSaved(true)}><Plus size={16} />Create playlist</button></div>}</div>}
    {tab === 'library' && <LibraryView />}</div>
  </div>
}

function PlansView({ done, toggleDone }: { done: string[]; toggleDone: (s: string) => void }) {
  const [planType, setPlanType] = useState<'nutrition' | 'workout'>('nutrition')
  const [selectedDay, setSelectedDay] = useState(1)
  const [savedPlaylist, setSavedPlaylist] = useState(false)
  const [waterLogged, setWaterLogged] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const workoutFacts = ['Strength adapts while you recover.', 'A short walk can improve post-meal energy.', 'Mobility work keeps every rep feeling better.']
  const workouts = [
    { name: 'Lower body strength', meta: 'Beginner · 28 min · 220 kcal', icon: Dumbbell, color: 'peach' },
    { name: 'Core & mobility flow', meta: 'All levels · 18 min · 140 kcal', icon: Activity, color: 'lavender' },
    { name: 'Low-impact full body', meta: 'Beginner · 24 min · 180 kcal', icon: Zap, color: 'mint' },
  ]
  const items = planType === 'nutrition' ? meals : workouts
  return <div className="page plans-page"><div className="plans-heading"><div><p className="eyebrow">YOUR ROUTINE</p><h1>Good morning, Jamie</h1><p className="muted intro">A little structure for a stronger, lighter week.</p></div><div className="plan-toggle" role="group" aria-label="Plan type"><button className={planType === 'nutrition' ? 'active' : ''} onClick={() => setPlanType('nutrition')}><Apple size={15} />Fuel</button><button className={planType === 'workout' ? 'active' : ''} onClick={() => setPlanType('workout')}><Dumbbell size={15} />Move</button></div></div><div className="plan-tabs"><button className="selected"><CalendarDays size={16} />Plan</button><button><Play size={16} />Playlist</button><button><BookOpen size={16} />Library</button></div><div className="tabs plan-type-tabs"><button className={planType === 'nutrition' ? 'selected' : ''} onClick={() => setPlanType('nutrition')}><Apple size={16} />Nutrition plan</button><button className={planType === 'workout' ? 'selected' : ''} onClick={() => setPlanType('workout')}><Dumbbell size={16} />Workout plan</button></div><div className="week-row">{['M','T','W','T','F','S','S'].map((day, i) => <button className={selectedDay === i ? 'today' : ''} key={`${day}${i}`} onClick={() => setSelectedDay(i)} aria-label={`Select ${day} ${29 + i > 30 ? i - 1 : 29 + i}`}><span>{day}</span><strong>{29 + i > 30 ? i - 1 : 29 + i}</strong></button>)}</div>{planType === 'nutrition' ? <div className="ai-plan"><div className="ai-badge"><Sparkles size={16} />AI FORMULATED</div><h2>Balanced fuel for your day</h2><p>1,840 kcal · 128g protein · 210g carbs · 58g fat</p><div className="macro-bars"><i /><i /><i /></div></div> : <div className="ai-plan workout-plan"><div className="ai-badge"><Sparkles size={16} />AI COACHED</div><h2>Move with intention.</h2><p>70 min planned · 3 sessions · Beginner friendly</p><div className="macro-bars"><i /><i /><i /></div></div>}<h2 className="subheading">Tuesday&apos;s {planType}</h2><div className="plan-list">{items.map((item) => <div className="plan-row" key={item.name}><div className={`row-icon ${item.color}`}><item.icon size={19} /></div><div className="row-copy"><strong>{item.name}</strong><span>{item.meta}</span></div><button className={`check ${done.includes(item.name) ? 'checked' : ''}`} onClick={() => toggleDone(item.name)} aria-label={`${done.includes(item.name) ? 'Mark incomplete' : 'Mark complete'} ${item.name}`}>{done.includes(item.name) ? <Check size={16} /> : <span />}</button></div>)}</div><div className="plan-actions"><button className="library-link"><Plus size={16} /> Swap from library</button><button className={`save-plan ${savedPlaylist ? 'saved' : ''}`} onClick={() => setSavedPlaylist(!savedPlaylist)}><BookOpen size={15} />{savedPlaylist ? 'Saved offline' : 'Save week'}</button></div>{planType === 'nutrition' ? <div className="nutrition-note"><div><span className="section-kicker">HYDRATION</span><strong>{waterLogged ? 'Water goal logged' : '6 of 8 glasses'}</strong></div><button onClick={() => setWaterLogged(!waterLogged)}>{waterLogged ? <Check size={15} /> : <Plus size={15} />} {waterLogged ? 'Done' : 'Log water'}</button></div> : <div className="workout-fact"><Sparkles size={16} /><span><b>Workout fact</b> {workoutFacts[selectedDay % workoutFacts.length]}</span></div>}<button className="plan-more" onClick={() => setShowMore(!showMore)}>{showMore ? 'Show less' : `View ${planType === 'nutrition' ? 'nutrition notes' : 'recovery tips'}`} <ChevronRight size={15} /></button>{showMore && <div className="detail-drawer"><strong>{planType === 'nutrition' ? 'Fuel your training' : 'Recovery day'} </strong><p>{planType === 'nutrition' ? 'Protein supports repair, colorful plants add micronutrients, and steady hydration keeps energy smooth.' : 'Take an easy walk, stretch for five minutes, and let your nervous system recharge before your next session.'}</p></div>}{planType === 'nutrition' ? <button className="library-link" onClick={() => setShowMore(!showMore)}><Plus size={16} /> Swap from library</button> : <button className="primary full" onClick={() => toggleDone('Workout session started')}><Play size={15} /> {done.includes('Workout session started') ? 'Workout started' : 'Start workout'}</button>}</div>
}

function LibraryView() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ category: '', target_muscle: '', equipment: '' })
  const params = new URLSearchParams({ pageSize: '500', ...(query && { q: query }), ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) })
  const [data, setData] = useState<{ data?: unknown[] }>({})
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => { let active = true; setIsLoading(true); fetch(`/api/exercises?${params.toString()}`).then((response) => response.json()).then((result) => { if (active) setData(result) }).finally(() => { if (active) setIsLoading(false) }); return () => { active = false } }, [params.toString()])
  const exercises = (data.data ?? []) as Array<{ id: string; name: string; category: string; target_muscle: string; equipment: string; instructions: string[]; media_urls: string[] }>
  const options = (key: keyof typeof filters) => [...new Set(exercises.map((item) => item[key]).filter(Boolean))]
  return <div className="page library-page"><p className="eyebrow">YOUR LIBRARY</p><h1>Find your next move</h1><p className="muted intro">Browse 500 exercises by name, category, target muscle, equipment, instructions, and media.</p><div className="library-filter-bar"><div className="searchbox"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises..." aria-label="Search exercises" /></div>{(['category', 'target_muscle', 'equipment'] as const).map((key) => <select key={key} value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })} aria-label={`Filter by ${key.replace('_', ' ')}`}><option value="">All {key.replace('_', ' ')}</option>{options(key).map((value: unknown) => <option key={String(value)} value={String(value)}>{String(value)}</option>)}</select>)}</div>{isLoading ? <div className="empty-plan-state"><p>Loading exercises...</p></div> : <div className="exercise-library-grid">{exercises.map((exercise: { id: string; name: string; category: string; target_muscle: string; equipment: string; instructions: string[]; media_urls: string[] }) => <article className="exercise-card" key={exercise.id}><div className="exercise-card-media">{exercise.media_urls?.[0] ? <img src={exercise.media_urls[0]} alt={`${exercise.name} demonstration`} loading="lazy" onError={(event) => { event.currentTarget.src = exercise.media_urls[0].replace('/videos/', '/images/').replace('.gif', '.jpg') }} /> : <Dumbbell size={26} />}</div><div className="exercise-card-body"><p className="eyebrow">{exercise.category}</p><h3>{exercise.name}</h3><div className="exercise-tags"><span>{exercise.target_muscle}</span><span>{exercise.equipment}</span></div><details><summary>Instructions</summary><p>{exercise.instructions?.[0] ?? 'Instructions unavailable.'}</p></details></div></article>)}</div>}</div>
}

function LegacyLibraryView() { return <div className="page"><p className="eyebrow">YOUR LIBRARY</p><h1>Find your next move</h1><p className="muted intro">Build a routine you&apos;ll actually look forward to.</p><div className="tabs"><button className="selected"><Dumbbell size={16} />Workouts</button><button><Apple size={16} />Nutrition</button></div><div className="searchbox"><Search size={18} /><input placeholder="Search workouts, recipes..." /></div><div className="library-cards">{[{ title: 'Low-impact full body', tag: 'Beginner · 24 min', icon: Activity, tone: 'peach' }, { title: 'Core & mobility flow', tag: 'All levels · 18 min', icon: Zap, tone: 'lavender' }, { title: 'High-protein overnight oats', tag: 'Breakfast · 420 kcal', icon: Apple, tone: 'mint' }, { title: 'Strong legs express', tag: 'Intermediate · 32 min', icon: Dumbbell, tone: 'blue' }].map((item) => <div className="library-card" key={item.title}><div className={`library-art ${item.tone}`}><item.icon size={30} /><button><Plus size={15} /></button></div><strong>{item.title}</strong><span>{item.tag}</span></div>)}</div></div> }

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
  return <div className="page social-page social-flow"><div className="social-intro"><div><p className="eyebrow">COMMUNITY · 12,840 MEMBERS</p><h1>Your support circle</h1><p className="muted intro">A place to ask, share, and keep showing up together.</p></div><div className="community-orb" aria-hidden="true"><Users size={27} /></div></div><div className="social-date-filter"><label htmlFor="social-date">Show posts for:</label><input id="social-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></div>
    {activeSection && <section className="social-detail-view"><button className="social-back-button" onClick={() => setActiveSection(null)}><ChevronRight size={16} /> Back to community</button>{activeSection === 'feed' && <><div className="detail-heading"><p className="eyebrow">COMMUNITY PULSE</p><h2>Small wins, shared</h2><span>{visiblePosts.length} posts on this date</span></div><div className="detail-compose compose-row"><div className="avatar small">JD</div><input value={post} onChange={(event) => setPost(event.target.value)} placeholder="Share a thought" /><button onClick={publishPost} aria-label="Publish post"><Plus size={18} /></button></div><div className="detail-post-list">{visiblePosts.map((item, index) => <article className="community-post" key={`${item}-${index}`}><div className="post-head"><div className="avatar small">{index ? 'SK' : 'JD'}</div><div><strong>{index ? 'Sam K.' : 'Jamie Davis'}</strong><span>{index ? '2h ago · Workout wins' : 'Just now · Community'}</span></div><MoreHorizontal size={18} /></div><p>{item.body}</p><div className="post-actions"><button className={likedPosts.includes(index) ? 'is-liked' : ''} onClick={() => toggleLike(index)}><HeartPulse size={15} /> {Number(index ? 24 : 1) + (likedPosts.includes(index) ? 1 : 0)}</button><button onClick={() => setNotice('Comments preview opened')}><MessageCircle size={15} /> Comment</button></div></article>)}</div></>}{activeSection === 'people' && <><div className="detail-heading"><p className="eyebrow">YOUR PEOPLE</p><h2>Find your rhythm</h2><span>Connect with people who get it.</span></div><div className="detail-compose compose-row"><div className="avatar small">JD</div><input value={post} onChange={(event) => setPost(event.target.value)} placeholder="Share a goal" /><button onClick={publishPost} aria-label="Post a goal"><Plus size={18} /></button></div><div className="people-detail-grid">{people.map((person, index) => <article key={person}><div className={`person-avatar person-${index}`}>{person[0]}</div><strong>{person}</strong><span>{index === 0 ? 'Meal prep · Mindful eating' : index === 1 ? 'Strength · Mobility' : 'Early morning training'}</span><button onClick={() => setConnected((items) => items.includes(person) ? items.filter((item) => item !== person) : [...items, person])}>{connected.includes(person) ? 'Connected' : 'Connect'} <ArrowRight size={14} /></button></article>)}</div></>}{activeSection === 'gyms' && <><div className="detail-heading"><p className="eyebrow">NEARBY</p><h2>Move together IRL</h2><span>Find a place to keep moving.</span></div><section className="social-gyms-card"><div className="gym-tools"><div className="tab-search"><Search size={17} /><input aria-label="Search gyms near you" value={gymSearch} onChange={(event) => setGymSearch(event.target.value)} placeholder="Search gym" /><span><MapPin size={13} /> GPS on</span></div><button className="post-gym-button" onClick={() => setGymPostOpen(!gymPostOpen)}><Plus size={15} /> Post a gym</button></div>{gymPostOpen && <form className="gym-post-form" onSubmit={publishGym}><input aria-label="Gym name" required value={newGym.name} onChange={(event) => setNewGym({ ...newGym, name: event.target.value })} placeholder="Gym name" /><input aria-label="Gym location" required value={newGym.location} onChange={(event) => setNewGym({ ...newGym, location: event.target.value })} placeholder="Neighborhood or address" /><button type="submit">Publish gym</button></form>}<div className="gym-list">{filteredGyms.map((gym) => <article key={`${gym.name}-${gym.location}`} onClick={() => setNotice(`${gym.name} details preview`)} role="button" tabIndex={0}><div className="gym-photo"><Dumbbell size={22} /></div><div><strong>{gym.name}</strong><span>{gym.location}</span><small>{gym.rating === 'New' ? 'Just added · Community post' : `★ ${gym.rating} · Open now`}</small></div><ArrowRight size={17} /></article>)}</div></section></>}{notice && <button className="social-notice" onClick={() => setNotice('')}>{notice} <X size={13} /></button>}</section>}
    <div className={`social-main-sections ${activeSection ? 'is-hidden' : ''}`}><div className="social-section-title"><button className="social-section-link" onClick={() => setActiveSection('feed')}><div className="social-title-copy"><p className="eyebrow">COMMUNITY PULSE</p><div className="social-title-row"><h2>Small wins, shared</h2><MessageCircle size={20} /></div></div><span className="social-arrow-more"><ArrowRight size={16} /><small>See more</small></span></button></div><section className="social-feed-card"><div className="community-posts" aria-label="Community posts">{visiblePosts.slice(0, 1).map((item, index) => <article className="community-post" key={`${item}-${index}`}><div className="post-head"><div className="avatar small">{index ? 'SK' : 'JD'}</div><div><strong>{index ? 'Sam K.' : 'Jamie Davis'}</strong><span>{index ? '2h ago · Workout wins' : 'Just now · Community'}</span></div><MoreHorizontal size={18} /></div><p>{item.body}</p><div className="post-actions"><button className={likedPosts.includes(index) ? 'is-liked' : ''} onClick={() => toggleLike(index)}><HeartPulse size={15} /> {Number(index ? 24 : 1) + (likedPosts.includes(index) ? 1 : 0)}</button><button onClick={() => { setNotice('Comments preview opened'); setPost(`Comment on ${index ? 'Sam’s' : 'your'} post`) }}><MessageCircle size={15} /> Comment</button></div></article>)}</div><p className="feed-scroll-hint"><ArrowRight size={13} /> Swipe to explore more posts</p></section>
    <div className="social-section-title"><button className="social-section-link" onClick={() => setActiveSection('people')}><div className="social-title-copy"><p className="eyebrow">YOUR PEOPLE</p><div className="social-title-row"><h2>Find your rhythm</h2><Users size={20} /></div></div><span className="social-arrow-more"><ArrowRight size={16} /><small>See more</small></span></button></div><section className="people-card-shell"><div className="people-strip">{people.map((person, index) => <article key={person}><div className={`person-avatar person-${index}`}>{person[0]}</div><strong>{person}</strong><span>{index === 0 ? 'Meal prep · Mindful eating' : index === 1 ? 'Strength · Mobility' : 'Early morning training'}</span><button onClick={() => setConnected((items) => items.includes(person) ? items.filter((item) => item !== person) : [...items, person])}>{connected.includes(person) ? 'Connected' : 'Connect'} <ArrowRight size={14} /></button></article>)}</div></section>
    <div className="social-section-title"><button className="social-section-link" onClick={() => setActiveSection('gyms')}><div className="social-title-copy"><p className="eyebrow">NEARBY</p><div className="social-title-row"><h2>Move together IRL</h2><MapPin size={20} /></div></div><span className="social-arrow-more"><ArrowRight size={16} /><small>See more</small></span></button></div><section className="social-gyms-card"><div className="gym-list">{filteredGyms.map((gym) => <article key={`${gym.name}-${gym.location}`} onClick={() => setNotice(`${gym.name} details preview`)} role="button" tabIndex={0}><div className="gym-photo"><Dumbbell size={22} /></div><div><strong>{gym.name}</strong><span>{gym.location}</span><small>{gym.rating === 'New' ? 'Just added · Community post' : `★ ${gym.rating} · Open now`}</small></div><ArrowRight size={17} /></article>)}</div></section>{notice && <button className="social-notice" onClick={() => setNotice('')}>{notice} <X size={13} /></button>}</div><section className={`social-coach-feature ${activeSection ? 'is-hidden' : ''}`}><div className="social-panel-heading"><div className="coach-avatar"><Sparkles size={24} /></div><div><strong>AI Chatbot</strong><span>Chat for personalized guidance</span></div><i>Online</i></div><CoachChat /></section>
  </div>
}

function ProgressView() { return <div className="page"><p className="eyebrow">YOUR JOURNEY</p><h1>Progress log</h1><p className="muted intro">Consistency is your superpower.</p><div className="progress-summary"><div><span>Current streak</span><strong>12 days</strong><small>Personal best: 18 days</small></div><div className="ring"><strong>76%</strong><span>this week</span></div></div><div className="section-heading"><h2>Activity overview</h2><button>September <ChevronRight size={15} /></button></div><div className="chart-card"><div className="chart-labels"><span>5h</span><span>4h</span><span>3h</span><span>2h</span><span>1h</span></div><div className="bars">{[38,58,44,72,52,84,35].map((height, i) => <div key={i}><i style={{ height: `${height}%` }} /><span>{['M','T','W','T','F','S','S'][i]}</span></div>)}</div></div><div className="metric-grid"><div><Flame size={17} /><strong>4.2</strong><span>workouts / week</span></div><div><Activity size={17} /><strong>96 min</strong><span>time invested</span></div><div><HeartPulse size={17} /><strong>68.4 kg</strong><span>current weight</span></div></div><button className="primary full"><Plus size={16} /> Log a measurement</button></div> }

function SettingsView({ userName, userEmail, initials }: { userName: string; userEmail: string; initials: string }) { return <div className="page"><p className="eyebrow">ACCOUNT</p><h1>Settings</h1><p className="muted intro">Make <Wordmark /> work for you.</p><div className="settings-profile"><div className="avatar">{initials}</div><div><strong>{userName}</strong><span>{userEmail}</span></div><button>Edit</button></div><div className="settings-group"><p>Preferences</p><button><span><Sparkles size={17} />Notifications</span><small>On <ChevronRight size={16} /></small></button><div className="default-theme-setting"><div><Palette size={17} /><span>Theme</span></div><div className="default-theme-preview"><span className="theme-colors" aria-hidden="true"><i /><i /><i /></span><strong>Fox Energy</strong><small>Default</small><Check size={15} /></div><p>Vibrant, sporty daytime. Built for your next move.</p></div><button><span><MapPin size={17} />Offline mode</span><small>Off <ChevronRight size={16} /></small></button></div><div className="settings-group"><p>Data & account</p><button><span><DownloadIcon />Export your data</span><ChevronRight size={16} /></button><button><span><UserRound size={17} />Contact the team</span><ChevronRight size={16} /></button></div><form action={signOut}><button className="signout" type="submit">Sign out</button></form></div> }
function MoonIcon() { return <span className="tiny-icon">☾</span> } function DownloadIcon() { return <span className="tiny-icon">↓</span> }

export default App
