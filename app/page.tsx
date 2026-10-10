'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Activity,
  Apple,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
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
  { id: 'library', label: 'Library', icon: BookOpen },
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
        {active === 'plans' && <PlansView done={done} toggleDone={toggleDone} />}
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

function SocialView() { return <div className="page"><p className="eyebrow">COMMUNITY</p><h1>Your support circle</h1><p className="muted intro">Ask questions, share wins, and find your people.</p><div className="social-hero"><div className="coach-avatar"><Sparkles size={24} /></div><div><strong>AI Coach</strong><span>Always here to help</span></div><button><MessageCircle size={17} /> Chat</button></div><div className="section-heading"><h2>Community feed</h2><button>New post <Plus size={15} /></button></div><div className="post"><div className="post-head"><div className="avatar small">SK</div><div><strong>Sam K.</strong><span>2h ago · Workout wins</span></div><MoreHorizontal size={18} /></div><p>Finished my first full week of strength training. Feeling stronger already.</p><div className="post-actions"><button><HeartPulse size={15} /> 24</button><button><MessageCircle size={15} /> 6 comments</button></div></div><div className="buddy-card"><div><MapPin size={18} /><strong>Find a gym buddy</strong><span>Connect with people near you</span></div><ArrowRight size={18} /></div></div> }

function ProgressView() { return <div className="page"><p className="eyebrow">YOUR JOURNEY</p><h1>Progress log</h1><p className="muted intro">Consistency is your superpower.</p><div className="progress-summary"><div><span>Current streak</span><strong>12 days</strong><small>Personal best: 18 days</small></div><div className="ring"><strong>76%</strong><span>this week</span></div></div><div className="section-heading"><h2>Activity overview</h2><button>September <ChevronRight size={15} /></button></div><div className="chart-card"><div className="chart-labels"><span>5h</span><span>4h</span><span>3h</span><span>2h</span><span>1h</span></div><div className="bars">{[38,58,44,72,52,84,35].map((height, i) => <div key={i}><i style={{ height: `${height}%` }} /><span>{['M','T','W','T','F','S','S'][i]}</span></div>)}</div></div><div className="metric-grid"><div><Flame size={17} /><strong>4.2</strong><span>workouts / week</span></div><div><Activity size={17} /><strong>96 min</strong><span>time invested</span></div><div><HeartPulse size={17} /><strong>68.4 kg</strong><span>current weight</span></div></div><button className="primary full"><Plus size={16} /> Log a measurement</button></div> }

function SettingsView({ palette, setPalette }: { palette: number; setPalette: (value: number) => void }) { return <div className="page"><p className="eyebrow">ACCOUNT</p><h1>Settings</h1><p className="muted intro">Make FitSync work for you.</p><div className="settings-profile"><div className="avatar">JD</div><div><strong>Jamie Davis</strong><span>jamie.davis@gmail.com</span></div><button>Edit</button></div><div className="settings-group"><p>Preferences</p><button><span><Sparkles size={17} />Notifications</span><small>On <ChevronRight size={16} /></small></button><div className="palette-setting"><div className="palette-setting-label"><span><Palette size={17} />Color palette</span><small>Choose a mood</small></div><div className="palette-options" role="radiogroup" aria-label="Color palette">{['Klein Blue','Citric Charge','Aquamarine Flow','Fuchsia Pulse','Tangerine Power'].map((name, index) => <button key={name} className={`palette-swatch palette-swatch-${index} ${palette === index ? 'selected' : ''}`} onClick={() => setPalette(index)} role="radio" aria-checked={palette === index} aria-label={`${name} palette`} title={`${name} palette`}><span />{palette === index && <span className="palette-check"><Check size={13} /></span>}</button>)}</div></div><button><span><MapPin size={17} />Offline mode</span><small>Off <ChevronRight size={16} /></small></button></div><div className="settings-group"><p>Data & account</p><button><span><DownloadIcon />Export your data</span><ChevronRight size={16} /></button><button><span><UserRound size={17} />Contact the team</span><ChevronRight size={16} /></button></div><button className="signout" onClick={() => location.reload()}>Sign out</button></div> }
function MoonIcon() { return <span className="tiny-icon">☾</span> } function DownloadIcon() { return <span className="tiny-icon">↓</span> }

export default App
