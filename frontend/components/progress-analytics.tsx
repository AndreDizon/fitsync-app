'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Activity, CalendarDays, Droplets, Utensils } from 'lucide-react'
import { planAnalytics } from '../../shared/plan-analytics'
import { goalOptions, type OnboardingProfile } from '../../shared/onboarding'
import type { PlanWeek } from '../../shared/daily-plans'
import '@/app/progress-analytics.css'

const n = (value: number, digits = 0) => value.toLocaleString('en-US', { maximumFractionDigits: digits })
const dateLabel = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))
const percent = (done: number, total: number) => total ? Math.round(done / total * 100) : null
function Stat({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return <div className="pa-stat"><dt>{label}</dt><dd>{value}</dd><p>{detail}</p></div>
}
function Meter({ label, done, total, unit = 'entries' }: { label: string; done: number; total: number; unit?: string }) {
  return <div className="pa-meter"><div><span>{label}</span><strong>{n(done)} / {n(total)} <small>{unit}</small></strong></div><progress value={done} max={total || 1} aria-label={label + ': ' + n(done) + ' of ' + n(total) + ' ' + unit}/></div>
}

/** Decorative section artwork, independent of the user's recorded data. */
function SectionArt({ variant }: { variant: 'consistency' | 'nutrition' | 'activity' }) {
  return <svg className={'pa-section-art pa-section-art-' + variant} viewBox="0 0 440 120" preserveAspectRatio="xMaxYMid slice" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {variant === 'consistency' && <>
        <path d="M460 17H358c-81 0-91 79-172 79H-20M460 32H364c-81 0-91 79-172 79H-20"/>
        <path d="M460 2H352c-81 0-91 79-172 79H-20" opacity=".55"/>
        <path d="m360 83-8 13h108M346 105l-8 13h122" opacity=".75"/>
      </>}
      {variant === 'nutrition' && <>
        <path d="M460 28H360c-68 0-88 65-156 65H-20M460 44H366c-68 0-88 65-156 65H-20"/>
        <path d="M460 98H380c-64 0-84-66-148-66H-20" opacity=".65"/>
        <path d="M355 67h66M370 77h51M385 87h36"/>
      </>}
      {variant === 'activity' && <>
        <path d="M460 36H359c-20 0-27 9-37 23l-26 37c-8 11-17 9-22-4l-25-65c-5-13-14-15-22-4l-35 48c-10 14-18 19-37 19H-20"/>
        <path d="M460 51H365c-20 0-27 9-37 23l-26 37c-8 11-17 9-22-4l-25-65c-5-13-14-15-22-4l-35 48c-10 14-18 19-37 19H-20" opacity=".7"/>
        <path d="m387 83-8 13h65M402 100l-8 13h50"/>
      </>}
    </g>
  </svg>
}
function TrainingTrend({ weeks }: { weeks: { start: string; minutes: number; finished: number; hasPlan: boolean }[] }) {
  const highest = Math.max(1, ...weeks.map(week => week.minutes))
  const x = (index: number) => weeks.length === 1 ? 280 : 40 + index / (weeks.length - 1) * 480
  const y = (minutes: number) => 152 - minutes / highest * 110
  const segments: string[][] = []
  weeks.forEach((week, index) => {
    if (!week.hasPlan) return
    if (!index || !weeks[index - 1].hasPlan) segments.push([])
    segments[segments.length - 1].push(`${x(index)},${y(week.minutes)}`)
  })
  return <figure className={'pa-training-trend' + (weeks.length > 6 ? ' is-dense' : '')} tabIndex={weeks.length > 6 ? 0 : undefined} aria-label={weeks.length > 6 ? 'Workout trend; scroll horizontally to see all dates' : undefined}><svg viewBox="0 0 560 200" role="img" aria-label={weeks.map(week => dateLabel(week.start) + ': ' + (week.hasPlan ? n(week.minutes) + ' estimated minutes; ' + week.finished + ' finished workout days' : 'no workout plan available')).join('; ')}>
    {[0, .5, 1].map(fraction => <g key={fraction}><line x1="40" x2="520" y1={y(highest * fraction)} y2={y(highest * fraction)} className="pa-trend-grid"/><text x="27" y={y(highest * fraction) + 4} textAnchor="end">{n(highest * fraction)}</text></g>)}
    {segments.map((segment, index) => <polyline key={index} points={segment.join(' ')} fill="none" stroke="#ffab6e" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>)}
    {weeks.map((week, index) => <g key={week.start}>{week.hasPlan ? <><circle cx={x(index)} cy={y(week.minutes)} r="5" fill="#ffe135" stroke="#25282a" strokeWidth="2"/><text className="pa-trend-value" x={x(index)} y={y(week.minutes) - 13} textAnchor="middle">{n(week.minutes)}</text></> : <text x={x(index)} y="140" textAnchor="middle">—</text>}<text x={x(index)} y="182" textAnchor="middle">{dateLabel(week.start)}</text></g>)}
  </svg></figure>
}

export function ProgressAnalytics({ weeks, visits, profile, today, loading, weight, delta }: {
  weeks: PlanWeek[]; visits: string[]; profile: OnboardingProfile | null; today: string; loading: boolean; weight: number | null; delta: number | null
}) {
  const [range, setRange] = useState(28), [calendarMode, setCalendarMode] = useState('tasks')
  const data = useMemo(() => planAnalytics(weeks, visits, profile, today, range), [weeks, visits, profile, today, range])
  const completion = percent(data.done, data.total)
  const average = (key: keyof typeof data.nutrition) => data.foodDays ? n(data.nutrition[key] / data.foodDays, key === 'energy' ? 0 : 1) : '—'
  const recent = data.days.slice(-7), maxEnergy = Math.max(1, ...recent.map(day => Math.max(day.plannedEnergy, day.nutrition.energy)))
  const frequencies = Array.from({ length: Math.ceil(range / 7) }, (_, index) => {
    const days = data.days.slice(index * 7, index * 7 + 7)
    return { start: days[0].date, minutes: days.reduce((sum, day) => sum + day.minutes, 0), finished: days.filter(day => day.workoutTotal > 0 && day.workoutDone === day.workoutTotal).length, hasPlan: days.some(day => day.workoutTotal > 0) }
  })
  const macroEnergy = [
    { name: 'Protein', value: data.nutrition.protein * 4, color: 'protein' },
    { name: 'Carbohydrates', value: data.nutrition.carbs * 4, color: 'carbs' },
    { name: 'Fat', value: data.nutrition.fat * 9, color: 'fat' },
  ]
  const macroTotal = macroEnergy.reduce((sum, macro) => sum + macro.value, 0)
  const calendarStart = (new Date(data.start + 'T12:00:00Z').getUTCDay() + 6) % 7
  return <div className="plan-analytics" aria-busy={loading}>
    <header className="pa-toolbar"><div><h2>Understand your progress</h2><p>{dateLabel(data.start)} – {dateLabel(today)} · {profile?.timeZone || 'Asia/Manila'}</p></div><fieldset><legend>Analytics period</legend>{[7, 28, 84].map(days => <button key={days} type="button" aria-pressed={range === days} onClick={() => setRange(days)}>{days} days</button>)}</fieldset></header>
    {loading ? <p className="pa-status" role="status">Loading your saved plans and activity…</p> : <p className="pa-coverage">Based on available saved plans · {data.loadedDays} of {range} days have a loaded plan. Missing history is not treated as missed activity.</p>}
    <nav className="pa-jump" aria-label="Analytics sections"><a href="#progress-habits"><CalendarDays size={16}/>Consistency</a><a href="#progress-nutrition"><Utensils size={16}/>Nutrition</a><a href="#progress-activity"><Activity size={16}/>Workouts</a></nav>

    <section id="progress-habits" className="pa-section pa-consistency-section" aria-labelledby="pa-behavior-title">
      <header className="pa-section-head"><CalendarDays size={24}/><div><h2 id="pa-behavior-title">Behavioral &amp; Consistency Insights</h2><p>How often you show up, and what you follow through on.</p></div><SectionArt variant="consistency"/></header>
      <div className="pa-surface">
        <dl className="pa-stats"><Stat label="Plan follow-through" value={completion === null ? '—' : completion + '%'} detail={data.done + ' of ' + data.total + ' exercise and food entries done'}/><Stat label="Days with completed tasks" value={data.activeDays} detail={data.scheduledDays + ' days have scheduled tasks'}/><Stat label="Current task streak" value={data.streak + ' days'} detail={'Best in this period: ' + data.best + ' days'}/><Stat label="Recorded app visits" value={data.visitSet.size} detail="Visits and completed tasks are tracked separately"/></dl>
        <div className="pa-behavior-grid"><div className="pa-calendar"><div className="pa-panel-heading"><h3>Consistency calendar</h3><label><span className="pa-sr">Calendar activity</span><select value={calendarMode} onChange={event => setCalendarMode(event.target.value)}><option value="tasks">Task completion</option><option value="visits">App visits</option></select></label></div>
          <div className="pa-days-labels">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={index}>{day}</span>)}</div>
          <div className="pa-calendar-grid">{Array.from({ length: calendarStart }, (_, index) => <span key={'pad' + index} aria-hidden="true"/>)}{data.days.map(day => {
            const tasks = day.workoutDone + day.foodDone, total = day.workoutTotal + day.foodTotal
            const active = calendarMode === 'visits' ? data.visitSet.has(day.date) : tasks > 0
            const description = calendarMode === 'visits' ? (active ? 'app visit recorded' : 'no visit recorded') : tasks + ' of ' + total + ' tasks done' + (!day.loaded ? '; plan history unavailable' : '')
            return <span key={day.date} className={(active ? 'is-active ' : '') + (day.date === today ? 'is-today ' : '') + (!day.loaded && !active ? 'is-unavailable' : '')} title={dateLabel(day.date) + ': ' + description} aria-label={day.date + ': ' + description}>{Number(day.date.slice(-2))}</span>
          })}</div><p className="pa-note">Yellow: recorded activity. Outline: today. A dash pattern means plan history is unavailable. Water logs are shown separately below.</p>
        </div><div className="pa-followthrough"><h3>Your plan, by type</h3><Meter label="Exercises completed" done={data.workoutDone} total={data.workoutTotal}/><Meter label="Food entries completed" done={data.foodDone} total={data.foodTotal}/><div className="pa-insight"><strong>{data.done ? 'Progress comes from recorded actions.' : 'Your first completed task starts the picture.'}</strong><p>{data.done ? 'You completed tasks on ' + data.activeDays + ' days in this period. Keep marking entries done so your history reflects what you did.' : 'Mark an exercise or food entry done in My Plan. Your calendar and completion rate will update from those records.'}</p></div></div></div>
        <details className="pa-details"><summary>Patterns by weekday &amp; how streaks work</summary><div className="pa-table-wrap"><table><caption>Days with at least one completed exercise or food entry</caption><thead><tr><th>Weekday</th><th>Scheduled days</th><th>Active days</th></tr></thead><tbody>{data.weekdays.map(day => <tr key={day.name}><th>{day.name}</th><td>{day.scheduled}</td><td>{day.completed}</td></tr>)}</tbody></table></div><p className="pa-note">Task streaks count consecutive dates with a completed exercise or food entry. A streak can end yesterday while today is still in progress. These streaks are limited to the selected period; rest days do not count as completed-task days. App visits do not complete a task.</p></details>
      </div>
    </section>

    <section id="progress-nutrition" className="pa-section pa-nutrition-section" aria-labelledby="pa-nutrition-title">
      <header className="pa-section-head"><Utensils size={24}/><div><h2 id="pa-nutrition-title">Nutrition &amp; Calorie Analysis</h2><p>Food marked done, portion-based nutrients, and your water log.</p></div><SectionArt variant="nutrition"/></header>
      <div className="pa-surface pa-nutrition">
        <div className="pa-panel-heading"><div><h3>Your food log</h3><p className="pa-note">{data.foodDays} days with food marked done · {data.foodDone} of {data.foodTotal} food entries completed</p></div><span className="pa-tag">{profile?.diet || 'Eating preference not set'}</span></div>
        <dl className="pa-stats pa-macros"><Stat label="Average energy" value={<>{average('energy')} <small>kcal</small></>} detail="Per day with at least one completed food entry"/><Stat label="Average protein" value={<>{average('protein')} <small>g</small></>} detail="From completed portions"/><Stat label="Average carbohydrates" value={<>{average('carbs')} <small>g</small></>} detail="From completed portions"/><Stat label="Average fat" value={<>{average('fat')} <small>g</small></>} detail="From completed portions"/></dl>
        <div className="pa-macro-split"><div><h3>Your macro energy split</h3><p className="pa-note">Share of logged macro energy, calculated at 4 kcal/g for protein and carbs, and 9 kcal/g for fat. Rounding and catalog values can differ from total kcal.</p></div><div>{macroTotal > 0 ? <><div className="pa-macro-track" role="img" aria-label={macroEnergy.map(macro => macro.name + ': ' + n(macro.value / macroTotal * 100) + '%').join(', ')}>{macroEnergy.map(macro => <span key={macro.name} className={'pa-macro-' + macro.color} style={{ width: macro.value / macroTotal * 100 + '%' }}/>)}</div><ul className="pa-macro-legend">{macroEnergy.map(macro => <li key={macro.name}><i className={'pa-macro-' + macro.color} aria-hidden="true"/>{macro.name}<strong>{n(macro.value / macroTotal * 100)}%</strong></li>)}</ul></> : <p className="pa-note">Complete a food entry to see your macro split.</p>}</div></div>
        <div className="pa-nutrition-grid"><div className="pa-energy-panel"><h3>Energy over the last 7 days</h3><p className="pa-note">Within the selected period. Blank logs do not mean zero food intake.</p><div className="pa-energy-chart" role="img" aria-label={recent.map(day => dateLabel(day.date) + ': ' + (day.foodDone ? n(day.nutrition.energy) + ' kcal logged' : 'no food logged') + ', ' + n(day.plannedEnergy) + ' kcal planned').join('; ')}>{recent.map(day => <div key={day.date}><strong>{day.foodDone ? n(day.nutrition.energy) : '—'}</strong><div className="pa-energy-track"><i className="pa-energy-planned" style={{ height: day.plannedEnergy / maxEnergy * 100 + '%' }}/><i className="pa-energy-logged" style={{ height: day.nutrition.energy / maxEnergy * 100 + '%' }}/></div><span>{dateLabel(day.date)}</span></div>)}</div><p className="pa-chart-key"><span>Yellow: logged kcal</span><span>Outline: scheduled kcal</span></p></div>
          <div className="pa-targets"><h3>Your planning reference</h3>{data.targets.energyRange ? <><strong>{n(data.targets.energyRange[0])}–{n(data.targets.energyRange[1])} <small>kcal / day</small></strong><p>Estimated from your saved onboarding profile.</p><dl><div><dt>Protein</dt><dd>{data.targets.protein} g</dd></div><div><dt>Carbohydrates</dt><dd>{data.targets.carbs} g</dd></div><div><dt>Fat</dt><dd>{data.targets.fat} g</dd></div></dl></> : <p>{data.targets.notes[0]}</p>}<p className="pa-note">Partial food logs cannot establish a calorie deficit or surplus. These are planning estimates, not measured energy needs.</p></div></div>
        <details className="pa-details"><summary>Meal breakdown &amp; daily nutrition data</summary><div className="pa-table-wrap"><table><caption>Food portions grouped by their scheduled meal</caption><thead><tr><th>Meal</th><th>Done / planned</th><th>Logged kcal</th></tr></thead><tbody>{data.meals.map(meal => <tr key={meal.name}><th>{meal.name}</th><td>{meal.done} / {meal.total}</td><td>{meal.done ? n(meal.energy) : '—'}</td></tr>)}</tbody></table></div><div className="pa-table-wrap"><table><caption>Completed food entries only, by date</caption><thead><tr><th>Date</th><th>kcal</th><th>Protein (g)</th><th>Carbs (g)</th><th>Fat (g)</th></tr></thead><tbody>{data.days.filter(day => day.foodDone > 0).map(day => <tr key={day.date}><th>{dateLabel(day.date)}</th>{Object.values(day.nutrition).map((value, index) => <td key={index}>{n(value, 1)}</td>)}</tr>)}</tbody></table>{!data.foodDays && <p className="pa-note">No completed food entries in this period.</p>}</div><p className="pa-note">Nutrition uses the food catalog and saved grams. A completed entry is treated as logged, and may not represent everything you ate. Averages divide by {data.foodDays || 'the number of'} days with food logs. Missing nutrient values contribute zero. Macro targets are allocations from the midpoint of the estimated energy range.</p><p className="pa-note">{data.targets.notes.join(' ')}</p><h3 className="pa-preferences-heading">Your saved meal preferences</h3><dl className="pa-preferences"><div><dt>Meals per day</dt><dd>{profile?.mealsPerDay || 'Not set'}</dd></div><div><dt>Cooking time per meal</dt><dd>{profile?.cookingMinutes ? profile.cookingMinutes + ' min' : 'Not set'}</dd></div><div><dt>Food budget</dt><dd>{profile?.budget || 'Not set'}</dd></div><div><dt>Eating preference</dt><dd>{profile?.diet || 'Not set'}</dd></div></dl></details>
        <div className="pa-water"><Droplets size={25}/><div><h3>Hydration follow-through</h3><p>{data.waterDays ? n(data.water / data.waterDays, 1) + ' glasses per day with a water log' : 'Log a glass in My Plan to start tracking.'}</p></div><dl><div><dt>Glasses logged</dt><dd>{data.water} <small>· {n(data.water * 250)} ml</small></dd></div><div><dt>App goal reached</dt><dd>{data.waterGoalDays} <small>of {data.waterDays} logged days</small></dd></div></dl></div>
        <p className="pa-note">The app water goal is 8 × 250 ml glasses. No water log means unrecorded, rather than no water consumed.</p>
      </div>
    </section>

    <section id="progress-activity" className="pa-section pa-activity-section" aria-labelledby="pa-activity-title">
      <header className="pa-section-head"><Activity size={24}/><div><h2 id="pa-activity-title">Physical Activity &amp; Workout Analytics</h2><p>Your completed movement, logged sets, and training preferences.</p></div><SectionArt variant="activity"/></header>
      <div className="pa-surface">
        <dl className="pa-stats"><Stat label="Exercises completed" value={data.workoutDone} detail={'Of ' + data.workoutTotal + ' scheduled exercises'}/><Stat label="Workout days finished" value={data.finishedDays} detail={'All exercises done on ' + data.finishedDays + ' of ' + data.workoutDays + ' planned workout days'}/><Stat label="Estimated completed time" value={<>{n(data.minutes)} <small>min</small></>} detail={'Of ' + n(data.plannedMinutes) + ' scheduled minutes; not a stopwatch total'}/><Stat label="Rest days in your plan" value={data.restDays} detail="Days explicitly marked for rest with no exercises"/></dl>
        <div className="pa-workout-grid"><div className="pa-training-chart"><h3>Training time across this period</h3><p>Estimated minutes from exercises marked done</p><TrainingTrend weeks={frequencies}/><p className="pa-note">Each point is a 7-day block starting {dateLabel(data.start)}. Gaps mean no workout plan is available. Includes saved rest, tempo and preparation times. No calorie-burn estimate is inferred.</p></div><div className="pa-distribution"><h3>Where you trained</h3><p className="pa-note">Completed exercises by primary body area. Counts are entries, not sets.</p>{data.groups.length ? data.groups.map(group => <Meter key={group.name} label={group.name} done={group.count} total={data.workoutDone}/>) : <p className="pa-empty">Complete an exercise to see your training distribution.</p>}</div></div>
        <details className="pa-details"><summary>Actual set logs &amp; training preferences</summary><dl className="pa-stats"><Stat label="Actual sets logged" value={data.actualSets} detail="Non-zero sets entered in Edit & log"/><Stat label="Repetitions logged" value={n(data.reps)} detail="Rep-based exercises only"/><Stat label="External-load volume" value={<>{n(data.volume)} <small>kg</small></>} detail="Logged reps × entered kg; excludes timed sets"/><Stat label="Timed work logged" value={<>{n(data.timedSeconds / 60, 1)} <small>min</small></>} detail="From timed set entries, without rest"/></dl><p className="pa-note">Actual set logs count even if the exercise has not been marked done. Planned sets are not substituted for missing logs. Load volume is not a strength score and excludes body weight unless entered as load.</p><dl className="pa-preferences"><div><dt>Main goal</dt><dd>{goalOptions.find(([key]) => key === profile?.goal)?.[1] || 'Not set'}</dd></div><div><dt>Preferred training days</dt><dd>{profile?.days.join(' · ') || 'Not set'}</dd></div><div><dt>Session preference</dt><dd>{profile ? profile.sessionMinutes + ' min · starts ' + profile.workoutStartTime : 'Not set'}</dd></div><div><dt>Equipment</dt><dd>{profile?.equipment.join(' · ') || 'Not set'}</dd></div><div><dt>Focus areas</dt><dd>{profile?.focusAreas.join(' · ') || 'Not set'}</dd></div><div><dt>Movement preferences</dt><dd>{profile?.adjustments.join(' · ') || 'None selected'}</dd></div></dl></details>
        <div className="pa-weight"><div><h3>Weight &amp; your goal</h3><p>Latest recorded weight, or your onboarding weight until a measurement is logged.</p></div><dl><div><dt>Current reference</dt><dd>{weight === null ? '—' : n(weight, 1) + ' kg'}</dd></div><div><dt>Change since first weight log</dt><dd>{delta === null ? 'Not enough logs' : (delta > 0 ? '+' : '') + n(delta, 1) + ' kg'}</dd></div><div><dt>Saved target</dt><dd>{profile?.targetWeightKg ? profile.targetWeightKg + ' kg' : 'Not set'}</dd></div></dl></div>
      </div>
    </section>
  </div>
}
