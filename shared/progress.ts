import { parsePlanWeek, taskMinutes, type PlanWeek } from './daily-plans'
export type ProgressKind = 'body' | 'wellness' | 'photo'
export type ProgressPayload = { weightKg?: number; bodyFat?: number; chest?: number; waist?: number; hips?: number; arm?: number; thigh?: number; rpe?: number; energy?: number; mood?: number; sleepQuality?: number; soreness?: number; sleepHours?: number; notes?: string; path?: string }
export type ProgressEntry = { id: string; kind: ProgressKind; date: string; payload: ProgressPayload; revision: number; created_at?: string; photoUrl?: string }
export type Award = { code: string; awarded_at: string; claimed_at?: string | null }
export const measurementFields = ['chest','waist','hips','arm','thigh'] as const
export function dateInZone(zone = 'Asia/Manila', date = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date) }
export function shiftDate(date: string, offset: number) { const value = new Date(date+'T12:00:00Z'); value.setUTCDate(value.getUTCDate()+offset); return value.toISOString().slice(0,10) }
export function validDate(value: unknown): value is string { return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value && value>='1900-01-01' }
export function parseProgress(input: unknown, today: string, photoPath?: string): ProgressEntry | null {
 if(!input||typeof input!=='object')return null
 const raw=input as ProgressEntry
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(raw.id)||!['body','wellness','photo'].includes(raw.kind)||!validDate(raw.date)||raw.date>today||!raw.payload||typeof raw.payload!=='object'||Array.isArray(raw.payload))return null
 const payload:ProgressPayload={}
 const allowed=raw.kind==='body'?['weightKg','bodyFat',...measurementFields]:raw.kind==='wellness'?['rpe','energy','mood','sleepQuality','soreness','sleepHours']:[]
 for(const key of allowed){const value=raw.payload[key as keyof ProgressPayload];if(value===undefined)continue;const limits=key==='weightKg'?[1,500]:key==='bodyFat'?[1,75]:measurementFields.includes(key as typeof measurementFields[number])?[5,300]:key==='rpe'?[1,10]:key==='sleepHours'?[0,24]:[1,5];if(typeof value!=='number'||!Number.isFinite(value)||value<limits[0]||value>limits[1]||!['weightKg','bodyFat','sleepHours',...measurementFields].includes(key)&&!Number.isInteger(value))return null;Object.assign(payload,{[key]:Math.round(value*100)/100})}
 if(raw.payload.notes!==undefined){if(typeof raw.payload.notes!=='string'||raw.payload.notes.length>500)return null;payload.notes=raw.payload.notes.trim()}
 if(raw.kind==='photo'){if(!photoPath)return null;payload.path=photoPath}else if(!Object.keys(payload).some(key=>key!=='notes'))return null
 if(!Number.isInteger(raw.revision)||raw.revision<0||raw.revision>2147483645)return null
 return{id:raw.id,kind:raw.kind,date:raw.date,payload,revision:raw.revision}
}
export function habitStats(weeks: PlanWeek[], visits: string[], today: string) {
 const days:Record<string,{workoutDone:number;foodDone:number;workoutTotal:number;minutes:number;session:boolean}>={}
 for(const raw of weeks){const week=parsePlanWeek(raw);if(!week)continue;week.days.forEach((day,i)=>{const date=shiftDate(week.week,i);if(date>today)return;const completed=day.workout.items.filter(item=>item.done);days[date]={workoutDone:completed.length,foodDone:day.nutrition.items.filter(item=>item.done).length,workoutTotal:day.workout.items.length,minutes:Math.round(completed.reduce((sum,item)=>sum+taskMinutes(item),0)*10)/10,session:!!day.workout.items.length&&completed.length===day.workout.items.length}})}
 const sorted=[...new Set(visits.filter(date=>validDate(date)&&date<=today))].sort();let best=0,run=0,previous='';for(const date of sorted){run=previous&&shiftDate(previous,1)===date?run+1:1;best=Math.max(best,run);previous=date}let streak=0;let cursor=sorted.includes(today)?today:shiftDate(today,-1);while(sorted.includes(cursor)){streak++;cursor=shiftDate(cursor,-1)}
 const completedDays=Object.keys(days).filter(date=>days[date].workoutDone+days[date].foodDone>0)
 return{days,streak,best,visits:sorted.length,completedDays:completedDays.length,todos:Object.values(days).reduce((n,d)=>n+d.workoutDone+d.foodDone,0),workouts:Object.values(days).filter(d=>d.session).length,monthMinutes:Math.round(Object.entries(days).filter(([date])=>date.slice(0,7)===today.slice(0,7)).reduce((n,[,d])=>n+d.minutes,0))}
}
export function achievementStats(weeks: PlanWeek[], visits: string[], today: string, entries: ProgressEntry[] = []) {
 const stats=habitStats(weeks,visits,today)
 const journalDays=new Set(entries.filter(entry=>entry.kind!=='photo'&&validDate(entry.date)&&entry.date<=today&&Object.entries(entry.payload).some(([key,value])=>key!=='notes'&&typeof value==='number'&&Number.isFinite(value))).map(entry=>entry.date)).size
 return {...stats,foods:Object.values(stats.days).reduce((sum,day)=>sum+day.foodDone,0),journalDays}
}
export const milestones=[
  {
    "code": "hello",
    "name": "First steps",
    "description": "Use FitSync on 1 day",
    "metric": "visits",
    "target": 1,
    "category": "consistency"
  },
  {
    "code": "streak3",
    "name": "Finding rhythm",
    "description": "Reach a 3-day app streak",
    "metric": "best",
    "target": 3,
    "category": "consistency"
  },
  {
    "code": "streak7",
    "name": "Week in sync",
    "description": "Reach a 7-day app streak",
    "metric": "best",
    "target": 7,
    "category": "consistency"
  },
  {
    "code": "streak14",
    "name": "Two weeks together",
    "description": "Reach a 14-day app streak",
    "metric": "best",
    "target": 14,
    "category": "consistency"
  },
  {
    "code": "streak30",
    "name": "Fox on fire",
    "description": "Reach a 30-day app streak",
    "metric": "best",
    "target": 30,
    "category": "consistency"
  },
  {
    "category": "consistency",
    "code": "streak60",
    "name": "In it together",
    "description": "Reach a 60-day app streak",
    "metric": "best",
    "target": 60
  },
  {
    "code": "todo1",
    "name": "One small win",
    "description": "Complete your first task",
    "metric": "todos",
    "target": 1,
    "category": "tasks"
  },
  {
    "code": "todo10",
    "name": "Building momentum",
    "description": "Complete 10 tasks",
    "metric": "todos",
    "target": 10,
    "category": "tasks"
  },
  {
    "code": "todo25",
    "name": "Momentum maker",
    "description": "Complete 25 tasks",
    "metric": "todos",
    "target": 25,
    "category": "tasks"
  },
  {
    "code": "todo100",
    "name": "Century club",
    "description": "Complete 100 tasks",
    "metric": "todos",
    "target": 100,
    "category": "tasks"
  },
  {
    "code": "todo250",
    "name": "Steady progress",
    "description": "Complete 250 tasks",
    "metric": "todos",
    "target": 250,
    "category": "tasks"
  },
  {
    "category": "tasks",
    "code": "todo500",
    "name": "Five hundred wins",
    "description": "Complete 500 tasks",
    "metric": "todos",
    "target": 500
  },
  {
    "code": "workout1",
    "name": "Session one",
    "description": "Finish 1 workout day",
    "metric": "workouts",
    "target": 1,
    "category": "training"
  },
  {
    "code": "workout5",
    "name": "Five finishes",
    "description": "Finish 5 workout days",
    "metric": "workouts",
    "target": 5,
    "category": "training"
  },
  {
    "code": "workout10",
    "name": "Stronger habit",
    "description": "Finish 10 workout days",
    "metric": "workouts",
    "target": 10,
    "category": "training"
  },
  {
    "code": "workout25",
    "name": "Training rhythm",
    "description": "Finish 25 workout days",
    "metric": "workouts",
    "target": 25,
    "category": "training"
  },
  {
    "code": "workout50",
    "name": "Fifty strong",
    "description": "Finish 50 workout days",
    "metric": "workouts",
    "target": 50,
    "category": "training"
  },
  {
    "category": "training",
    "code": "workout100",
    "name": "Built through practice",
    "description": "Finish 100 workout days",
    "metric": "workouts",
    "target": 100
  },
  {
    "code": "food1",
    "name": "First food log",
    "description": "Mark 1 food entry done",
    "metric": "foods",
    "target": 1,
    "category": "nutrition"
  },
  {
    "code": "food10",
    "name": "Fuel in focus",
    "description": "Mark 10 food entries done",
    "metric": "foods",
    "target": 10,
    "category": "nutrition"
  },
  {
    "code": "food25",
    "name": "Regular refuel",
    "description": "Mark 25 food entries done",
    "metric": "foods",
    "target": 25,
    "category": "nutrition"
  },
  {
    "code": "food50",
    "name": "Fuel rhythm",
    "description": "Mark 50 food entries done",
    "metric": "foods",
    "target": 50,
    "category": "nutrition"
  },
  {
    "code": "food100",
    "name": "A hundred portions",
    "description": "Mark 100 food entries done",
    "metric": "foods",
    "target": 100,
    "category": "nutrition"
  },
  {
    "category": "nutrition",
    "code": "food250",
    "name": "Mindful routine",
    "description": "Mark 250 food entries done",
    "metric": "foods",
    "target": 250
  },
  {
    "code": "journal1",
    "name": "Start your story",
    "description": "Log measurements or a check-in on 1 distinct day",
    "metric": "journalDays",
    "target": 1,
    "category": "journal"
  },
  {
    "code": "journal3",
    "name": "Checking in",
    "description": "Log measurements or a check-in on 3 distinct days",
    "metric": "journalDays",
    "target": 3,
    "category": "journal"
  },
  {
    "code": "journal7",
    "name": "Seven reflections",
    "description": "Log measurements or a check-in on 7 distinct days",
    "metric": "journalDays",
    "target": 7,
    "category": "journal"
  },
  {
    "code": "journal14",
    "name": "Know your rhythm",
    "description": "Log measurements or a check-in on 14 distinct days",
    "metric": "journalDays",
    "target": 14,
    "category": "journal"
  },
  {
    "code": "journal30",
    "name": "A fuller picture",
    "description": "Log measurements or a check-in on 30 distinct days",
    "metric": "journalDays",
    "target": 30,
    "category": "journal"
  },
  {
    "category": "journal",
    "code": "journal60",
    "name": "Your evolving story",
    "description": "Log measurements or a check-in on 60 distinct days",
    "metric": "journalDays",
    "target": 60
  }
] as const
type WeightTrendContext = { nutritionContext?: string; heightCm?: string }
export function weightForecast(entries: ProgressEntry[], target: number | null, age: number, today: string, context?: WeightTrendContext) {
 const unavailable = (reason: string) => ({ reason, date: null as string | null, rate: null as number | null, r2: null as number | null, earliest: null as string | null, latest: null as string | null, weeklyPoints: 0, historyDays: 0 })
 if (!validDate(today)) return unavailable('Choose a valid date to review your trend.')
 if (!Number.isFinite(age) || age < 18 || age > 120) return unavailable('A target-date estimate is available only for adults. Your logs and progress charts still work.')
 if (context?.nutritionContext === 'review') return unavailable('Review weight goals with a qualified professional. Automatic target dates are paused for your planning preferences.')
 if (!target || !Number.isFinite(target) || target < 20 || target > 350) return unavailable('Set a valid target weight to explore your logged trend.')
 const daily = new Map<string, ProgressEntry>()
 for (const entry of [...entries].sort((a,b) => (a.created_at || '').localeCompare(b.created_at || '') || a.revision - b.revision)) {
  const weight = entry.payload?.weightKg
  if (entry.kind === 'body' && validDate(entry.date) && typeof weight === 'number' && Number.isFinite(weight) && weight >= 20 && weight <= 350 && entry.date <= today && entry.date >= shiftDate(today, -90)) daily.set(entry.date, entry)
 }
 const points = [...daily.values()].sort((a,b) => a.date.localeCompare(b.date))
 if (points.length < 4) return unavailable('Add weight entries in at least 4 different weeks, spanning 21 days or more.')
 const first = points[0], last = points[points.length - 1]
 const span = (Date.parse(last.date) - Date.parse(first.date)) / 86400000
 if (span < 21) return unavailable('Your weight entries need to span at least 21 days.')
 if (last.date < shiftDate(today, -14)) return unavailable('Add a recent weight entry; your latest measurement is over 14 days old.')
 const height = Number(context?.heightCm) / 100
 if (height >= 1 && height <= 2.5 && [target, last.payload.weightKg!].some(weight => weight / height ** 2 < 18.5 || weight / height ** 2 >= 40)) return unavailable('This weight profile needs professional review before estimating a target date.')
 const median = (values: number[]) => { const sorted = [...values].sort((a,b) => a-b), middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 }
 const grouped = new Map<string, { x: number; y: number }[]>()
 for (const point of points) {
  const weekday = (new Date(point.date + 'T12:00:00Z').getUTCDay() + 6) % 7
  const week = shiftDate(point.date, -weekday)
  const bucket = grouped.get(week) || []
  bucket.push({ x: (Date.parse(point.date) - Date.parse(first.date)) / 86400000, y: point.payload.weightKg! }); grouped.set(week, bucket)
 }
 // Equal-weight weekly medians keep a week of frequent logging from dominating the fit.
 const weekly = [...grouped.values()].map(bucket => ({ x: median(bucket.map(p => p.x)), y: median(bucket.map(p => p.y)) }))
 if (weekly.length < 4) return unavailable('Log weight in at least 4 different weeks; many entries in one week do not replace longer history.')
 const fit = (sample: typeof weekly) => {
  const mx = sample.reduce((n,p) => n+p.x, 0) / sample.length, my = sample.reduce((n,p) => n+p.y, 0) / sample.length
  const xx = sample.reduce((n,p) => n+(p.x-mx)**2, 0), yy = sample.reduce((n,p) => n+(p.y-my)**2, 0)
  const slope = sample.reduce((n,p) => n+(p.x-mx)*(p.y-my), 0) / xx
  const at = (x: number) => my + slope * (x-mx)
  return { slope, at, r2: yy ? Math.max(0, 1 - sample.reduce((n,p) => n+(p.y-at(p.x))**2, 0) / yy) : 0 }
 }
 const model = fit(weekly), rate = model.slope * 7
 if (Math.abs(last.payload.weightKg! - target) < .5) return unavailable('Your latest entry is within 0.5 kg of the target.')
 if (!Number.isFinite(rate) || Math.abs(rate) < .02 || model.r2 < .5) return unavailable('Your recorded trend is too flat or variable for a useful date estimate.')
 if (Math.abs(rate) > 1.5) return unavailable('Your recent trend is changing too quickly for this simple projection to be useful.')
 const anchor = model.at(span)
 if (Math.abs(last.payload.weightKg! - anchor) > Math.max(1.5, anchor * .03)) return unavailable('Your latest measurement differs substantially from the weekly trend. Check it and add consistent measurements before estimating a date.')
 const horizon = Math.min(180, Math.max(28, span * 4))
 const daysToTarget = (target - anchor) / model.slope
 if (daysToTarget <= 0) return unavailable('Your recent trend is moving away from this target.')
 if (daysToTarget > horizon) return unavailable('This target is beyond the supported trend horizon. More history or a nearer review goal is needed.')
 // Sensitivity analysis, not a calibrated confidence or prediction interval.
 const sensitivity = weekly.map((_, index) => fit(weekly.filter((_, i) => i !== index)))
 if (sensitivity.some(test => test.slope * model.slope <= 0 || Math.abs(test.slope / model.slope - 1) > .5)) return unavailable('The estimated pace changes too much when one week is left out. Add more consistent weekly measurements.')
 const dates = [daysToTarget, ...sensitivity.map(test => (target - test.at(span)) / test.slope)]
 if (dates.some(days => !Number.isFinite(days) || days <= 0 || days > horizon)) return unavailable('The target-date range is too sensitive to individual weeks. Add more history before projecting it.')
 const projected = shiftDate(last.date, Math.ceil(daysToTarget)), earliest = shiftDate(last.date, Math.ceil(Math.min(...dates))), latest = shiftDate(last.date, Math.ceil(Math.max(...dates)))
 if (earliest <= today) return unavailable('The previous trend date has passed. Add a new weight entry.')
 return { reason: 'A short-term extrapolation of weekly median weights from up to 90 days. The date range shows sensitivity to leaving out one week; it is not a probability or a medical forecast. Metabolic adaptation and changing habits can alter the trend.', date: projected, earliest, latest, rate: Math.round(rate * 100) / 100, r2: Math.round(model.r2 * 100) / 100, weeklyPoints: weekly.length, historyDays: span }
}
