'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CoachChat } from '@/components/coach-chat'
import './coach-chat.css'
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
  Droplets,
  Flame,
  Flag,
  Gamepad2,
  HeartPulse,
  Home,
  MapPin,
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
  return <div className="brand-mark"><Activity size={19} strokeWidth={2.8} /></div>
}

function App() {
  const [active, setActive] = useState<Section>('home')
  const [water, setWater] = useState(4)
  const [done, setDone] = useState<string[]>([])
  const [showAuth, setShowAuth] = useState(false)
  const [palette, setPalette] = useState(0)
  const [focusMode, setFocusMode] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    lastScrollY.current = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollingDown = currentScrollY > lastScrollY.current + 2
      const scrollingUp = currentScrollY < lastScrollY.current - 2

      if (scrollingDown && currentScrollY > 24) setNavHidden(true)
      if (scrollingUp || currentScrollY <= 24) setNavHidden(false)
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const toggleDone = (item: string) => setDone((current) => current.includes(item) ? current.filter((x) => x !== item) : [...current, item])

  return (
    <main className={`app-shell palette-${palette}`}>
      <aside className="desktop-sidebar">
        <div className="brand"><Logo /><span>Fit<span>Sync</span></span></div>
        <div className="side-profile"><div className="avatar">JD</div><div><strong>Jamie Davis</strong><small>Balanced beginner</small></div><ChevronRight size={16} /></div>
        <nav className="side-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}><Icon size={19} />{label}</button>)}</nav>
        <div className="side-bottom"><button onClick={() => setActive('settings')}><Settings size={18} />Settings</button><div className="coach-card"><Sparkles size={18} /><strong>Ask your AI coach</strong><span>Get personalized guidance</span><button onClick={() => setActive('social')}>Start chat <ArrowRight size={14} /></button></div></div>
      </aside>

      <section className="content-wrap">
        <header className="topbar"><div className="mobile-brand"><Logo /><strong>Fit<span>Sync</span></strong></div><div className="top-actions"><button aria-label="Search"><Search size={19} /></button><button className="profile-button" onClick={() => setShowAuth(true)}><div className="avatar small">JD</div><span>Jamie</span><ChevronRight size={15} /></button></div></header>

        {active === 'home' && <HomeView water={water} setWater={setWater} done={done} toggleDone={toggleDone} onNavigate={setActive} focusMode={focusMode} setFocusMode={setFocusMode} />}
        {active === 'plans' && <PlansWorkspace done={done} toggleDone={toggleDone} />}
        {active === 'library' && <LibraryView />}
        {active === 'social' && <SocialView />}
        {active === 'progress' && <ProgressView />}
        {active === 'settings' && <SettingsView palette={palette} setPalette={setPalette} />}
      </section>

      <nav className={`mobile-nav ${navHidden ? 'nav-hidden' : ''}`} aria-hidden={navHidden}>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)} tabIndex={navHidden ? -1 : 0}><Icon size={20} /><span>{label}</span></button>)}</nav>
      {showAuth && <div className="modal-backdrop" onClick={() => setShowAuth(false)}><div className="auth-card" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setShowAuth(false)}><X size={18} /></button><div className="auth-icon"><HeartPulse size={22} /></div><h2>Welcome to FitSync</h2><p>Sign in to keep your progress in sync.</p><input placeholder="Email address" /><input placeholder="Password" type="password" /><button className="primary full" onClick={() => setShowAuth(false)}>Sign in</button><button className="ghost full">Continue with Google</button><small>Don&apos;t have an account? <b>Register here</b></small></div></div>}
    </main>
  )
}

function HomeView({ water, setWater, done, toggleDone, onNavigate, focusMode, setFocusMode }: { water: number; setWater: (v: number) => void; done: string[]; toggleDone: (s: string) => void; onNavigate: (s: Section) => void; focusMode: boolean; setFocusMode: (value: boolean) => void }) {
  return <div className={`page ${focusMode ? 'focus-mode' : ''}`}><div className="ambient-shape shape-one" aria-hidden="true" /><div className="ambient-shape shape-two" aria-hidden="true" /><div className="greeting"><div><p className="eyebrow">Tuesday, September 30</p><h1>Good morning, Jamie <Sparkles className="greeting-spark" size={18} /></h1><p className="muted">Small steps today, stronger you tomorrow.</p></div><div className="streak"><Flame size={19} fill="currentColor" /><strong>12</strong><span>day streak</span></div></div>
    <div className="hero-card"><div><p className="eyebrow light">YOUR DAILY FOCUS</p><h2>Move with intention.</h2><p>Complete your plan to keep your momentum going.</p><button className="light-button" onClick={() => onNavigate('plans')}>View today&apos;s plan <ArrowRight size={15} /></button></div><button className={`hero-orb ${focusMode ? 'is-focused' : ''}`} onClick={() => setFocusMode(!focusMode)} aria-pressed={focusMode} aria-label={focusMode ? 'Turn off focus mode' : 'Start focus mode'}><Dumbbell size={43} /><span>{focusMode ? 'Locked in' : 'Tap to focus'}</span></button></div>
    <div className="section-heading"><h2>Today at a glance</h2><button onClick={() => onNavigate('progress')}>See progress <ArrowRight size={15} /></button></div>
    <div className="stats-grid"><div className="stat-card"><div className="stat-icon peach"><Flame size={18} /></div><strong>1,240</strong><span>kcal remaining</span><div className="progress-line"><i style={{ width: '46%' }} /></div></div><div className="stat-card"><div className="stat-icon mint"><Dumbbell size={18} /></div><strong>24 <small>min</small></strong><span>movement today</span><div className="progress-line mint-line"><i style={{ width: '65%' }} /></div></div><div className="stat-card water-card"><div className="stat-icon blue"><Activity size={18} /></div><strong>{water}<small>/ 8 glasses</small></strong><span>water tracker</span><button className="water-add" onClick={() => setWater(water >= 8 ? 0 : water + 1)}><Plus size={14} />Add glass</button></div></div>
    <div className="section-heading"><h2>Tuesday&apos;s plan</h2><button onClick={() => onNavigate('plans')}>Full schedule <ArrowRight size={15} /></button></div>
    <div className="plan-list">{[{ title: 'Lower body strength', meta: 'Workout · 28 min · Beginner', icon: Dumbbell, tone: 'peach' }, { title: 'Greek yogurt parfait', meta: 'Breakfast · 380 kcal', icon: Utensils, tone: 'mint' }].map((item) => <div className="plan-row" key={item.title}><div className={`row-icon ${item.tone}`}><item.icon size={19} /></div><div className="row-copy"><strong>{item.title}</strong><span>{item.meta}</span></div><button className={`check ${done.includes(item.title) ? 'checked' : ''}`} onClick={() => toggleDone(item.title)}>{done.includes(item.title) ? <Check size={16} /> : <span />}</button></div>)}</div>
    <div className="section-heading"><h2>Explore FitSync</h2></div><div className="explore-grid"><button onClick={() => onNavigate('social')}><MessageCircle size={20} /><strong>Ask AI coach</strong><span>Personalized answers</span></button><button onClick={() => onNavigate('library')}><BookOpen size={20} /><strong>Browse library</strong><span>Find your next move</span></button><button onClick={() => onNavigate('progress')}><Trophy size={20} /><strong>Progress log</strong><span>Celebrate your wins</span></button></div>
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
    <div className="plans-hero"><div><p className="eyebrow">YOUR PERSONAL PLAN</p><h1>{mode === 'workout' ? 'Train with intention.' : 'Fuel your momentum.'}</h1><p className="muted intro">A clear, flexible week built around your goals.</p></div><div className={`plan-mode-switch ${mode}`} role="group" aria-label="Plan mode"><button className={mode === 'workout' ? 'active' : ''} onClick={() => setMode('workout')}><Dumbbell size={15} />Workout</button><button className={mode === 'nutrition' ? 'active' : ''} onClick={() => setMode('nutrition')}><Apple size={15} />Nutrition</button></div></div>
    <div className="plan-tabs" role="tablist" aria-label="Plan sections">{([{ id: 'plan', label: 'My plan', icon: CalendarDays }, { id: 'playlist', label: 'Playlist', icon: Play }, { id: 'library', label: 'Library', icon: BookOpen }] as const).map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)} role="tab" aria-selected={tab === id}><Icon size={16} />{label}</button>)}</div>
    {tab === 'plan' && <>
      <div className="plan-summary"><div className="plan-summary-top"><div className="ai-badge"><Sparkles size={16} />AI COACHED</div><span className="plan-status"><Check size={13} /> {mode === 'workout' ? '3 sessions' : '4 meals'} planned</span></div><h2>{mode === 'workout' ? 'A stronger week starts here.' : 'Balanced fuel, made simple.'}</h2><p>{mode === 'workout' ? '70 min planned · Recovery-aware · Beginner friendly' : '1,840 kcal · 128g protein · 210g carbs · 58g fat'}</p><div className="plan-progress"><span style={{ width: mode === 'workout' ? '38%' : '52%' }} /></div><small>{mode === 'workout' ? '1 of 3 sessions complete' : '2 of 4 meals complete'}</small></div>
      <div className="plan-section-header"><div><p className="eyebrow">WEEK AT A GLANCE</p><h2>Choose a day</h2></div><button className="outline-action"><DownloadIcon />Export week</button></div><div className="week-row plan-week">{week.map((name, index) => <button key={name} className={day === index ? 'today' : ''} onClick={() => setDay(index)}><span>{name}</span><strong>{index + 1}</strong><small>{index === day ? 'Today' : index < day ? 'Done' : 'Open'}</small></button>)}</div>
      <div className="plan-section-header"><div><p className="eyebrow">{week[day].toUpperCase()} FOCUS</p><h2>{mode === 'workout' ? "Today's movement" : "Today's nourishment"}</h2></div><button className="text-action" onClick={() => setSaved(!saved)}>{saved ? 'Saved' : 'Save week'} <Check size={15} /></button></div>
      <div className="plan-items timeline-items">{items.map((item, index) => <article className={`plan-item timeline-item ${completed(item.title) ? 'is-complete' : ''}`} key={item.title}><div className="timeline-rail" aria-hidden="true"><span className="timeline-dot" />{index === items.length - 1 && <Flag size={15} className="timeline-flag" />}</div><div className={`plan-item-icon ${item.tone}`}><item.icon size={21} /></div><div className="plan-item-copy"><div><label className="time-editor"><span>{itemTimes[item.title] || `${index + 8}:00`}</span><input type="time" aria-label={`Set time for ${item.title}`} value={itemTimes[item.title] || `${String(index + 8).padStart(2, '0')}:00`} onChange={(event) => setItemTimes({ ...itemTimes, [item.title]: event.target.value })} /></label><strong>{item.title}</strong><span>{item.meta}</span></div><button className={`round-check ${completed(item.title) ? 'checked' : ''}`} onClick={() => toggleDone(item.title)} aria-label={`${completed(item.title) ? 'Undo' : 'Mark'} ${item.title} complete`}>{completed(item.title) ? <Check size={15} /> : <span />}</button></div><div className="plan-item-actions"><button onClick={() => toggleDone(item.title)}>{completed(item.title) ? 'Completed' : 'Mark done'}</button><button>Swap</button><button onClick={() => setSaved(true)}>Save</button></div></article>)}</div>
      <div className="plan-bottom-grid"><div className="recovery-card"><div className="card-icon"><HeartPulse size={19} /></div><div><p className="eyebrow">RECOVERY NOTE</p><h3>{mode === 'workout' ? 'Rest is part of training.' : 'Hydration supports every goal.'}</h3><p>{mode === 'workout' ? 'Take a slower day when your body asks for it. Light mobility still counts.' : 'Track your water throughout the day and keep your energy steady.'}</p></div></div><div className="water-card-plan"><div className="water-check-heading"><div><p className="eyebrow">WATER CHECK</p><strong>{water} / 8 glasses</strong><span className="water-hint">Tap a droplet to log water</span></div></div><div className="water-droplets" role="group" aria-label="Water glasses"><div className="water-droplet-grid">{Array.from({ length: 8 }, (_, index) => <button key={index} className={`water-droplet ${index < water ? 'filled' : ''}`} onClick={() => setWater(index < water ? index : index + 1)} aria-label={`${index < water ? 'Remove' : 'Mark'} glass ${index + 1}`} aria-pressed={index < water}><Droplet size={22} fill="currentColor" /><span className="sr-only">{index + 1}</span></button>)}</div></div></div></div>
    </>}
    {tab === 'playlist' && <div className="tab-content"><div className="tab-search"><Search size={17} /><input aria-label="Search playlist" value={tabSearch} onChange={(event) => setTabSearch(event.target.value)} placeholder="Search your playlist..." /><span>{filteredItems.length} matches</span></div>{tabSearch ? <div className="plan-library-grid">{filteredItems.map((item) => <div className="plan-library-card" key={item.title}><div className={`plan-item-icon ${item.tone}`}><item.icon size={20} /></div><strong>{item.title}</strong><span>{item.meta}</span><button onClick={() => toggleDone(item.title)}>{completed(item.title) ? 'Completed' : 'Mark done'}</button></div>)}</div> : <div className="empty-plan-state"><div className="state-icon"><Play size={24} /></div><p className="eyebrow">YOUR PLAYLIST</p><h2>{saved ? 'Week saved offline.' : 'Build your rhythm.'}</h2><p className="muted">Save a full week or add favorites from the library. Your choices stay ready when you are.</p><button className="primary" onClick={() => setSaved(true)}><Plus size={16} />Create playlist</button></div>}</div>}
    {tab === 'library' && <div className="tab-content"><div className="tab-search"><Search size={17} /><input aria-label="Search library" value={tabSearch} onChange={(event) => setTabSearch(event.target.value)} placeholder="Search workouts, meals..." /><span>{filteredItems.length * 2} matches</span></div><div className="plan-library-grid">{filteredItems.concat(filteredItems).map((item, index) => <div className="plan-library-card" key={`${item.title}-${index}`}><div className={`plan-item-icon ${item.tone}`}><item.icon size={20} /></div><strong>{item.title}</strong><span>{item.meta}</span><button onClick={() => setSaved(true)}><Plus size={14} /> Add to playlist</button></div>)}</div>{filteredItems.length === 0 && <p className="empty-search">No content found. Try another search.</p>}</div>}
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

function LibraryView() { return <div className="page"><p className="eyebrow">YOUR LIBRARY</p><h1>Find your next move</h1><p className="muted intro">Build a routine you&apos;ll actually look forward to.</p><div className="tabs"><button className="selected"><Dumbbell size={16} />Workouts</button><button><Apple size={16} />Nutrition</button></div><div className="searchbox"><Search size={18} /><input placeholder="Search workouts, recipes..." /></div><div className="library-cards">{[{ title: 'Low-impact full body', tag: 'Beginner · 24 min', icon: Activity, tone: 'peach' }, { title: 'Core & mobility flow', tag: 'All levels · 18 min', icon: Zap, tone: 'lavender' }, { title: 'High-protein overnight oats', tag: 'Breakfast · 420 kcal', icon: Apple, tone: 'mint' }, { title: 'Strong legs express', tag: 'Intermediate · 32 min', icon: Dumbbell, tone: 'blue' }].map((item) => <div className="library-card" key={item.title}><div className={`library-art ${item.tone}`}><item.icon size={30} /><button><Plus size={15} /></button></div><strong>{item.title}</strong><span>{item.tag}</span></div>)}</div></div> }

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

function SettingsView({ palette, setPalette }: { palette: number; setPalette: (value: number) => void }) { return <div className="page"><p className="eyebrow">ACCOUNT</p><h1>Settings</h1><p className="muted intro">Make FitSync work for you.</p><div className="settings-profile"><div className="avatar">JD</div><div><strong>Jamie Davis</strong><span>jamie.davis@gmail.com</span></div><button>Edit</button></div><div className="settings-group"><p>Preferences</p><button><span><Sparkles size={17} />Notifications</span><small>On <ChevronRight size={16} /></small></button><div className="palette-setting"><div className="palette-setting-label"><span><Palette size={17} />Color palette</span><small>Choose a mood</small></div><div className="palette-options" role="radiogroup" aria-label="Color palette">{['Klein Blue','Citric Charge','Aquamarine Flow','Fuchsia Pulse','Tangerine Power'].map((name, index) => <button key={name} className={`palette-swatch palette-swatch-${index} ${palette === index ? 'selected' : ''}`} onClick={() => setPalette(index)} role="radio" aria-checked={palette === index} aria-label={`${name} palette`} title={`${name} palette`}><span />{palette === index && <span className="palette-check"><Check size={13} /></span>}</button>)}</div></div><button><span><MapPin size={17} />Offline mode</span><small>Off <ChevronRight size={16} /></small></button></div><div className="settings-group"><p>Data & account</p><button><span><DownloadIcon />Export your data</span><ChevronRight size={16} /></button><button><span><UserRound size={17} />Contact the team</span><ChevronRight size={16} /></button></div><button className="signout" onClick={() => location.reload()}>Sign out</button></div> }
function MoonIcon() { return <span className="tiny-icon">☾</span> } function DownloadIcon() { return <span className="tiny-icon">↓</span> }

export default App
