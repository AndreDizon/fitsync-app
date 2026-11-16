import { shiftDate, type ProgressEntry, type ProgressPayload } from './progress'

export const journalLabels: Record<string, string> = { weightKg: 'Weight', bodyFat: 'Body fat', chest: 'Chest', waist: 'Waist', hips: 'Hips', arm: 'Arm', thigh: 'Thigh', fatMass: 'Estimated fat mass', leanMass: 'Estimated fat-free mass', energy: 'Energy', mood: 'Mood', sleepQuality: 'Sleep quality', soreness: 'Soreness', sleepHours: 'Sleep duration', rpe: 'Workout effort / RPE' }
export const journalUnit = (metric: string) => ['weightKg', 'fatMass', 'leanMass'].includes(metric) ? 'kg' : metric === 'bodyFat' ? '%' : metric === 'sleepHours' ? 'hours' : metric === 'rpe' ? '/10' : ['energy', 'mood', 'sleepQuality', 'soreness'].includes(metric) ? '/5' : 'cm'
export function journalValue(entry: ProgressEntry, metric: string): number | null {
  if (metric === 'fatMass' || metric === 'leanMass') {
    const { weightKg, bodyFat } = entry.payload
    if (typeof weightKg !== 'number' || typeof bodyFat !== 'number') return null
    const fat = weightKg * bodyFat / 100
    return metric === 'fatMass' ? fat : weightKg - fat
  }
  const value = entry.payload[metric as keyof ProgressPayload]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
export function journalPeriod(entries: ProgressEntry[], today: string, range: number) {
  const start = range ? shiftDate(today, 1 - range) : '1900-01-01'
  return entries.filter(entry => entry.date >= start && entry.date <= today).sort((a, b) => b.date.localeCompare(a.date) || (b.created_at || '').localeCompare(a.created_at || '') || b.id.localeCompare(a.id))
}
export function journalTrend(entries: ProgressEntry[], metric: string) {
  const daily = new Map<string, { date: string; value: number }>()
  // Oldest-to-newest ensures the latest recorded value wins for each date.
  for (const entry of [...entries].sort((a, b) => a.date.localeCompare(b.date) || (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id))) {
    const value = journalValue(entry, metric)
    if (value !== null) daily.set(entry.date, { date: entry.date, value })
  }
  const points = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date))
  const latest = points.at(-1), first = points[0]
  return { points, latest, first, change: points.length > 1 ? latest!.value - first.value : null }
}
function csvCell(value: string | number) {
  const safe = typeof value === 'string' && /^[=+\-@\t\r\n]/.test(value.trimStart()) ? "'" + value : String(value)
  return '"' + safe.replaceAll('"', '""') + '"'
}
export function journalCsv(entries: ProgressEntry[]) {
  const rows: (string | number)[][] = [['Date', 'Record type', 'Measurement', 'Value', 'Unit', 'Notes']]
  for (const entry of entries) if (entry.kind !== 'photo') {
    for (const [metric, value] of Object.entries(entry.payload)) if (typeof value === 'number') rows.push([entry.date, entry.kind, journalLabels[metric] || metric, value, journalUnit(metric), entry.payload.notes || ''])
  }
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}
