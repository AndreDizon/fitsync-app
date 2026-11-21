'use client'

import { useState } from 'react'
import type { monitoringInsights } from '../../shared/monitoring-insights'
import '@/app/monitoring-insights.css'

type Insights = ReturnType<typeof monitoringInsights>
const number = (value: number, digits = 1) => value.toLocaleString('en', { maximumFractionDigits: digits })
const date = (value: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'))

export function NutritionMonitoring({ data }: { data: Insights }) {
  return <section className="monitoring-panel monitoring-nutrition" aria-labelledby="nutrition-monitoring-title">
    <h3 id="nutrition-monitoring-title">Beyond calories</h3>
    <p>{data.foodEntries ? `${data.uniqueFoods} different foods across ${data.foodGroups} catalog groups, on ${data.foodDays} logged days.` : 'Mark foods done in My Plan to start your nutrient record.'} Food variety is descriptive, not a diet-quality score.</p>
    <dl className="monitoring-metrics">{data.nutrients.slice(0, 3).map(nutrient => <div key={nutrient.key}><dt>{nutrient.name}</dt><dd>{nutrient.average === null ? 'Not recorded' : <>{number(nutrient.average)} <small>{nutrient.unit}</small></>}</dd><p>{nutrient.known} / {data.foodEntries} food entries have this value</p></div>)}</dl>
    <p className="monitoring-caption">Known amounts per day with a food log. Partial days and missing nutrient values make these incomplete intake estimates.</p>
    <details><summary>More nutrients &amp; recording coverage</summary><div className="monitoring-table" tabIndex={0} role="region" aria-label="Additional nutrients; scroll to see all columns"><table><caption>Known nutrients from completed food portions</caption><thead><tr><th>Nutrient</th><th>Daily logged average</th><th>Entries with data</th></tr></thead><tbody>{data.nutrients.map(nutrient => <tr key={nutrient.key}><th>{nutrient.name}</th><td>{nutrient.average === null ? 'Not reported' : number(nutrient.average) + ' ' + nutrient.unit}</td><td>{nutrient.known} / {data.foodEntries}</td></tr>)}</tbody></table></div><p>{data.foodEntries} of {data.scheduledFood} scheduled portions are marked done. This measures recording follow-through, not whether you ate enough. Log sauces, drinks and snacks too. Total sugars include naturally occurring sugars; they are not added or free sugars.</p><p>Values use the existing USDA catalog, scaled by saved edible grams. Missing means unknown, not zero. No deficiency, sodium-excess diagnosis or calorie deficit is inferred.</p><a href="https://fdc.nal.usda.gov/data-documentation/" target="_blank" rel="noreferrer">USDA data basis<span className="pa-sr"> (opens in a new tab)</span></a></details>
  </section>
}

export function WorkoutMonitoring({ data }: { data: Insights }) {
  const [selected, setSelected] = useState('')
  const exercise = data.exercises.find(exercise => exercise.id === selected) || data.exercises[0]
  const outlook = data.outlook
  return <div className="monitoring-workout">
    <section className="monitoring-panel" aria-labelledby="exercise-progress-title"><div className="monitoring-heading"><h3 id="exercise-progress-title">Your exercise, session to session</h3>{!!data.exercises.length && <label>Exercise<select value={exercise.id} onChange={event => setSelected(event.target.value)}>{data.exercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}{exercise.timed ? ' · timed' : ''}</option>)}</select></label>}</div>
      {exercise ? <><p>Compare your two latest logged dates for {exercise.name}. Entries for the same exercise on one date are combined.</p><div className="monitoring-table" tabIndex={0} role="region" aria-label="Exercise comparison; scroll to see all columns"><table><caption>Actual logs only; planned sets are never substituted</caption><thead><tr><th>Logged date</th><th>Sets</th><th>{exercise.timed ? 'Work time' : 'Repetitions'}</th>{!exercise.timed && <><th>Heaviest entered load</th><th>Load volume</th></>}</tr></thead><tbody>{exercise.sessions.slice(0, 2).map(session => <tr key={session.date}><th>{date(session.date)}</th><td>{session.sets}</td><td>{exercise.timed ? number(session.amount / 60) + ' min' : session.amount}</td>{!exercise.timed && <><td>{number(session.maxLoad)} kg</td><td>{number(session.volume)} kg</td></>}</tr>)}</tbody></table></div>{exercise.sessions.length < 2 && <p>Log this exercise on another date to compare sessions.</p>}<p className="monitoring-caption">More reps or load can reflect different technique, set counts or equipment. Volume is reps × entered kg, not a strength score. Timed work excludes rest. No maximum-lift or muscle-growth prediction is made.</p></> : <p>Open an exercise in My Plan → Edit &amp; log → Log actual sets. Enter the repetitions or work time you actually completed, plus any external load.</p>}
    </section>
    <section className="monitoring-panel monitoring-outlook" aria-labelledby="workout-outlook-title"><h3 id="workout-outlook-title">Next 7 days: completion outlook</h3>
      {outlook.expected !== null ? <><p className="monitoring-outlook-value">About <strong>{outlook.expected} of {outlook.upcoming}</strong> planned exercise entries</p><p>If your recorded completion pace continues: {number((outlook.rate || 0) * 100, 0)}% of exercises marked done across {outlook.historyDays} past workout days in the selected period.</p></> : <p>{outlook.rate === null ? 'Record at least 4 past workout days spanning 7 days in this period to establish a completion pace. Choose a wider analytics period if needed.' : outlook.upcomingLoadedDays < 7 ? 'Load the next 7 days in My Plan to see an outlook for that schedule.' : 'No exercises are scheduled in the next 7 days.'}</p>}
      <details><summary>How to read this outlook</summary><p>This is a simple planning heuristic: upcoming exercise entries × your recorded historical completion rate. Today is excluded from the baseline because it may still be in progress. All 7 upcoming days must be loaded. Edited or incomplete plans can change the result.</p><p>It predicts recording follow-through only, not physical ability, calories burned, strength gains or weight change. It does not change your plan automatically.</p></details>
    </section>
  </div>
}

export function RecoveryMonitoring({ data }: { data: Insights }) {
  return <section className="monitoring-panel monitoring-recovery" aria-labelledby="recovery-monitoring-title"><h3 id="recovery-monitoring-title">Effort &amp; recovery context</h3><p>Recent 7-day averages from your check-ins within this analytics period. Higher soreness and effort describe a different experience from higher energy or sleep quality.</p>
    <dl className="monitoring-metrics">{data.recovery.map(metric => <div key={metric.key}><dt>{metric.name}</dt><dd>{metric.average === null ? 'Not tracked' : <>{number(metric.average)} <small>{metric.unit}</small></>}</dd><p>{metric.days} logged {metric.days === 1 ? 'day' : 'days'}{metric.change !== null ? ` · ${metric.change > 0 ? '+' : ''}${number(metric.change)} vs prior 7 days` : ''}</p></div>)}</dl>
    <details><summary>Improve the picture</summary><p>In Documentation → Energy &amp; recovery, record sleep, energy, soreness and workout effort after training. Keep ratings consistent: energy and sleep quality run from 1 (low) to 5 (high); soreness uses 1 (low) to 5 (high); effort uses 1 (very easy) to 10 (maximal).</p><p>Only the latest value for each measurement on each date counts. Comparison needs 3 logged dates in both 7-day blocks. Blank entries remain unknown. These self-reports add context; they cannot diagnose recovery, injury or overtraining, and do not trigger automatic training increases.</p></details>
  </section>
}
