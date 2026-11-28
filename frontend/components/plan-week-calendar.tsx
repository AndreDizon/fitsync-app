'use client'

import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { currentDay, currentWeek, weekDays } from '../../shared/daily-plans'
import { shiftDate } from '../../shared/progress'
import { validWorkoutDate, workoutDayIndex, workoutWeightOutlook } from '../../shared/workout-program'
import type { OnboardingProfile } from '../../shared/onboarding'
import '@/app/plan-week-calendar.css'

type CalendarDay = { rest: boolean; total: number; done: number }

export function PlanWeekCalendar({ week, day, days, timeZone, nutrition, onSelect, onSelectDate, profile, getWeekDays }: {
  week: string
  day: number
  days: CalendarDay[]
  timeZone: string
  nutrition: boolean
  onSelect: (day: number) => void
  onSelectDate: (date: string) => void
  profile: OnboardingProfile | null
  getWeekDays: (week: string) => CalendarDay[] | null
}) {
  const [view, setView] = useState<'week' | 'plan'>('week')
  const startDate = profile?.workoutStartDate && validWorkoutDate(profile.workoutStartDate) ? profile.workoutStartDate : null
  const endDate = profile ? workoutWeightOutlook(profile).date : null
  const [anchor, setAnchor] = useState(() => (startDate || week).slice(0, 7))
  const [visibleMonths, setVisibleMonths] = useState(1)
  useEffect(() => { setAnchor((startDate || week).slice(0, 7)); setVisibleMonths(1) }, [startDate])
  const localToday = () => { const now = new Date(); return shiftDate(currentWeek(now, timeZone), currentDay(now, timeZone)) }
  const [todayDate, setTodayDate] = useState(localToday)
  useEffect(() => {
    const refresh = () => { const now = new Date(); setTodayDate(shiftDate(currentWeek(now, timeZone), currentDay(now, timeZone))) }
    refresh()
    const timer = setInterval(refresh, 60000)
    return () => clearInterval(timer)
  }, [timeZone])
  const selectedDate = shiftDate(week, day)
  const today = week === currentWeek(new Date(todayDate + 'T12:00:00Z'), 'UTC') ? workoutDayIndex(todayDate) : -1
  const dates = weekDays.map((_, index) => new Date(shiftDate(week, index) + 'T12:00:00Z'))
  const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' })
  const first = dates[0], last = dates[6]
  const range = `${month.format(first)} ${first.getUTCDate()} – ${month.format(last)} ${last.getUTCDate()}, ${last.getUTCFullYear()}`
  const selected = days[day]
  const status = (entry: CalendarDay) => entry.rest ? 'Rest day' : !entry.total ? 'Not planned' : `${entry.done}/${entry.total} done`
  const rangeEnd = endDate || (startDate && startDate > todayDate ? startDate : todayDate)
  const hasRange = rangeEnd >= todayDate
  const firstMonth = todayDate.slice(0, 7), lastMonth = rangeEnd.slice(0, 7)
  const boundedAnchor = anchor < firstMonth ? firstMonth : anchor > lastMonth ? lastMonth : anchor
  const inRange = (date: string) => hasRange && date >= todayDate && date <= rangeEnd
  const jump = (date: string) => { if (!inRange(date)) return; setAnchor(date.slice(0, 7)); setVisibleMonths(1); onSelectDate(date) }
  const monthAt = (offset: number) => { const date = new Date(boundedAnchor + '-01T12:00:00Z'); date.setUTCMonth(date.getUTCMonth() + offset); return date }
  const remainingMonths = hasRange ? (Number(lastMonth.slice(0, 4)) - Number(boundedAnchor.slice(0, 4))) * 12 + Number(lastMonth.slice(5, 7)) - Number(boundedAnchor.slice(5, 7)) + 1 : 0
  const monthCount = Math.min(visibleMonths, remainingMonths)
  const summaries = new Map<string, CalendarDay[] | null>()
  const summaryFor = (date: string) => {
    const key = currentWeek(new Date(date + 'T12:00:00Z'), 'UTC')
    if (!summaries.has(key)) summaries.set(key, key === week ? days : getWeekDays(key))
    const value = summaries.get(key)?.[workoutDayIndex(date)]
    return value || { rest: !nutrition && !!profile && !profile.days.includes(weekDays[workoutDayIndex(date)].slice(0, 3)), total: 0, done: 0, unknown: true }
  }
  const markerLabels = (date: string) => [date === todayDate ? 'Today' : '', date === startDate ? 'Plan start' : '', date === endDate ? 'Estimated end' : ''].filter(Boolean)
  const markers = (date: string) => <span className="pwc-markers">{markerLabels(date).map(label => <span key={label} data-marker={label}>{label}</span>)}</span>

  return <section className="plan-week-calendar" aria-label="Weekly plan calendar">
    <div className="pwc-sky" aria-hidden="true">
      <svg viewBox="0 0 900 360" preserveAspectRatio="xMaxYMid slice">
        <g fill="currentColor">
          {[
            { x: 340, y: 55, scale: .65, opacity: .55 },
            { x: 560, y: 34, scale: 1.2, opacity: 1 },
            { x: 790, y: 78, scale: .65, opacity: .6 },
            { x: -45, y: 304, scale: 1.25, opacity: .5 },
            { x: 420, y: 318, scale: .9, opacity: .65 },
            { x: 770, y: 304, scale: 1.15, opacity: .5 },
          ].map((cloud, index) => <path key={index} transform={`translate(${cloud.x} ${cloud.y}) scale(${cloud.scale})`} opacity={cloud.opacity} d="M19 68C8 68 0 60 0 49C0 38 8 30 19 30C21 16 35 9 47 15C55-3 81-2 88 16C105 10 121 24 119 39C130 39 138 46 138 55C138 63 132 68 122 68Z" />)}
        </g>
        <g fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".65">
          <path d="M-60 30C105-36 235 90 411 49S696-18 960 43"/>
          <path d="M-60 43C105-23 235 103 411 62S696-5 960 56"/>
          <path d="M-60 303C118 248 230 349 418 312S729 271 960 324"/>
          <path d="M-60 315C118 260 230 361 418 324S729 283 960 336"/>
          <path d="M-60 327C118 272 230 373 418 336S729 295 960 348" opacity=".6"/>
        </g>
      </svg>
    </div>
    <header className="pwc-heading"><div><h3>{view === 'week' ? 'Your week' : 'My plan calendar'}</h3><p>{view === 'week' ? range : 'Dates from today through your estimated end date.'}</p></div><label className="pwc-view-control"><span className="pwc-visually-hidden">Calendar view</span><select aria-label="Calendar view" value={view} onChange={event => { const next = event.target.value as 'week' | 'plan'; setView(next); setVisibleMonths(1); if (next === 'week') onSelectDate(localToday()); else { const date = localToday(); setAnchor(date.slice(0, 7)); if (date <= rangeEnd) onSelectDate(date) } }}><option value="week">This week</option><option value="plan">My plan calendar</option></select></label></header>
    {view === 'week' ? <nav className="pwc-days" aria-label="Choose plan day">
      {weekDays.map((name, index) => {
        const entry = days[index], complete = entry.total > 0 && entry.done === entry.total && !entry.rest
        return <button type="button" key={name} className="pwc-day" aria-pressed={day === index} aria-current={today === index ? 'date' : undefined} aria-label={`${name}, ${month.format(dates[index])} ${dates[index].getUTCDate()}${today === index ? ', today' : ''}, ${status(entry)}`} data-rest={entry.rest} data-complete={complete} onClick={() => onSelect(index)}>
          <span className="pwc-weekday"><span className="pwc-full-name">{name}</span><span className="pwc-short-name" aria-hidden="true">{name.slice(0, 3)}</span></span>
          <span className="pwc-date">{dates[index].getUTCDate()}{complete && <Check size={12} className="pwc-complete" aria-hidden="true" />}</span>
          <span className="pwc-day-status">{status(entry)}</span>
          {markers(shiftDate(week, index))}
          {entry.rest && !markerLabels(shiftDate(week, index)).length && <span className="pwc-current-marker">Rest</span>}
        </button>
      })}
    </nav> : <div className="pwc-plan-view">
      <div className="pwc-calendar-jumps" aria-label="Jump to calendar marker"><button type="button" disabled={!hasRange} onClick={() => jump(localToday())}>Today</button>{startDate && <button type="button" disabled={!inRange(startDate)} title={!inRange(startDate) ? 'The start date is outside the remaining plan dates' : undefined} onClick={() => jump(startDate)}>Plan start</button>}{endDate && <button type="button" disabled={!inRange(endDate)} onClick={() => jump(endDate)}>Estimated end</button>}</div>
      <label className="pwc-month-picker"><span>Browse month</span><input type="month" min={firstMonth} max={lastMonth < firstMonth ? firstMonth : lastMonth} disabled={!hasRange} value={hasRange ? boundedAnchor : firstMonth} onChange={event => { const value = event.target.value; if (validWorkoutDate(value + '-01') && value >= firstMonth && value <= lastMonth) { setAnchor(value); setVisibleMonths(1) } }} /></label>
      <p className="pwc-calendar-note">{startDate ? 'Plan starts ' + new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(startDate + 'T12:00:00Z')) + '. ' : 'Set a workout start date in planning preferences to show the start marker. '}{endDate ? 'The end marker is your target-weight scenario, not a guaranteed completion date.' : 'No estimated end date is available, so only today through the start date is shown.'} Dates follow {timeZone}. Select an unloaded day to fetch its saved plan.</p>
      {!hasRange && <p className="pwc-calendar-note" role="status">Your estimated end date has passed. Update your planning preferences to show a new range.</p>}
      <div className="pwc-months">{Array.from({ length: monthCount }, (_, index) => {
        const first = monthAt(index), monthKey = first.toISOString().slice(0, 7)
        const firstDay = monthKey === firstMonth ? Number(todayDate.slice(8, 10)) : 1
        const lastDay = monthKey === lastMonth ? Number(rangeEnd.slice(8, 10)) : new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
        const offset = workoutDayIndex(monthKey + '-' + String(firstDay).padStart(2, '0'))
        const count = lastDay - firstDay + 1
        return <section className="pwc-month" key={monthKey} aria-label={new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)}>
          <h4>{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)}</h4>
          <div className="pwc-month-weekdays" aria-hidden="true">{weekDays.map(name => <span key={name}>{name.slice(0, 3)}</span>)}</div>
          <div className="pwc-month-days">{Array.from({ length: offset }, (_, blank) => <span className="pwc-blank-date" key={'blank-' + blank} />)}{Array.from({ length: count }, (_, index) => {
            const date = monthKey + '-' + String(firstDay + index).padStart(2, '0'), entry = summaryFor(date)
            const description = entry.rest ? 'Rest day' : 'unknown' in entry ? 'Select to load' : status(entry)
            return <button type="button" className="pwc-day" key={date} data-date={date} data-rest={entry.rest} aria-pressed={selectedDate === date} aria-current={todayDate === date ? 'date' : undefined} aria-label={[new Intl.DateTimeFormat('en', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z')), ...markerLabels(date), description].join(', ')} onClick={() => onSelectDate(date)}><span className="pwc-date">{firstDay + index}</span><span className="pwc-day-status">{description}</span>{markers(date)}</button>
          })}</div>
        </section>
      })}</div>
      {monthCount < remainingMonths && <button type="button" className="pwc-more-dates" onClick={() => setVisibleMonths(count => count + 1)}>Show more dates</button>}
      <p className="pwc-range-announcement" role="status">{hasRange ? <>Showing {monthCount} {monthCount === 1 ? 'month' : 'months'}. {monthCount < remainingMonths ? 'More plan dates are available below.' : 'No dates beyond the estimated end are shown.'}</> : 'No dates in the remaining plan range.'}</p>
    </div>}
    {(view === 'week' || inRange(selectedDate)) && <footer className="pwc-summary" aria-live="polite"><strong>{view === 'plan' ? new Intl.DateTimeFormat('en', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(selectedDate + 'T12:00:00Z')) : weekDays[day]}{today === day ? ' · Today' : ''}</strong><span>{selected.rest ? 'Recovery day' : !selected.total ? `Add ${nutrition ? 'foods' : 'exercises'} to plan this day` : `${selected.done} of ${selected.total} ${nutrition ? 'food portions' : selected.total === 1 ? 'exercise' : 'exercises'} completed`}</span></footer>}
  </section>
}
