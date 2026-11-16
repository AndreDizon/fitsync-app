'use client'

import { Check } from 'lucide-react'
import { currentDay, currentWeek, weekDays } from '../../shared/daily-plans'
import { shiftDate } from '../../shared/progress'
import '@/app/plan-week-calendar.css'

type CalendarDay = { rest: boolean; total: number; done: number }

export function PlanWeekCalendar({ week, day, days, timeZone, nutrition, onSelect }: {
  week: string
  day: number
  days: CalendarDay[]
  timeZone: string
  nutrition: boolean
  onSelect: (day: number) => void
}) {
  const now = new Date()
  const today = week === currentWeek(now, timeZone) ? currentDay(now, timeZone) : -1
  const dates = weekDays.map((_, index) => new Date(shiftDate(week, index) + 'T12:00:00Z'))
  const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' })
  const first = dates[0], last = dates[6]
  const range = `${month.format(first)} ${first.getUTCDate()} – ${month.format(last)} ${last.getUTCDate()}, ${last.getUTCFullYear()}`
  const selected = days[day]
  const status = (entry: CalendarDay) => entry.rest ? 'Rest day' : !entry.total ? 'Not planned' : `${entry.done}/${entry.total} done`

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
    <header className="pwc-heading"><div><h3>Your week</h3><p>{range}</p></div><button type="button" className="pwc-today" data-current={today === day} disabled={today < 0} aria-label={today === day ? 'Viewing today' : 'Go to today'} onClick={() => onSelect(today)}>{today === day ? 'Viewing today' : 'Go to today'}</button></header>
    <nav className="pwc-days" aria-label="Choose plan day">
      {weekDays.map((name, index) => {
        const entry = days[index], complete = entry.total > 0 && entry.done === entry.total && !entry.rest
        return <button type="button" key={name} className="pwc-day" aria-pressed={day === index} aria-current={today === index ? 'date' : undefined} aria-label={`${name}, ${month.format(dates[index])} ${dates[index].getUTCDate()}${today === index ? ', today' : ''}, ${status(entry)}`} data-rest={entry.rest} data-complete={complete} onClick={() => onSelect(index)}>
          <span className="pwc-weekday"><span className="pwc-full-name">{name}</span><span className="pwc-short-name" aria-hidden="true">{name.slice(0, 3)}</span></span>
          <span className="pwc-date">{dates[index].getUTCDate()}{complete && <Check size={12} className="pwc-complete" aria-hidden="true" />}</span>
          <span className="pwc-day-status">{status(entry)}</span>
          <span className="pwc-current-marker" aria-hidden="true">{today === index ? 'Today' : entry.rest ? 'Rest' : '\u00a0'}</span>
        </button>
      })}
    </nav>
    <footer className="pwc-summary" aria-live="polite"><strong>{weekDays[day]}{today === day ? ' · Today' : ''}</strong><span>{selected.rest ? 'Recovery day' : !selected.total ? `Add ${nutrition ? 'foods' : 'exercises'} to plan this day` : `${selected.done} of ${selected.total} ${nutrition ? 'food portions' : selected.total === 1 ? 'exercise' : 'exercises'} completed`}</span></footer>
  </section>
}
