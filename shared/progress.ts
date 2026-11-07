import { parsePlanWeek, taskMinutes, type PlanWeek } from './daily-plans'
export type ProgressKind = 'body' | 'wellness' | 'photo'
export type ProgressPayload = { weightKg?: number; bodyFat?: number; chest?: number; waist?: number; hips?: number; arm?: number; thigh?: number; rpe?: number; energy?: number; mood?: number; sleepQuality?: number; soreness?: number; sleepHours?: number; notes?: string; path?: string }
export type ProgressEntry = { id: string; kind: ProgressKind; date: string; payload: ProgressPayload; revision: number; created_at?: string; photoUrl?: string }
export type Award = { code: string; awarded_at: string }
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
export const milestones=[{code:'hello',name:'First steps',description:'Use FitSync on 1 day',metric:'visits',target:1},{code:'streak3',name:'Finding rhythm',description:'Reach a 3-day app streak',metric:'best',target:3},{code:'streak7',name:'Week in sync',description:'Reach a 7-day app streak',metric:'best',target:7},{code:'streak30',name:'Fox on fire',description:'Reach a 30-day app streak',metric:'best',target:30},{code:'todo1',name:'One small win',description:'Complete your first task',metric:'todos',target:1},{code:'todo25',name:'Momentum maker',description:'Complete 25 tasks',metric:'todos',target:25},{code:'todo100',name:'Century club',description:'Complete 100 tasks',metric:'todos',target:100},{code:'workout10',name:'Stronger habit',description:'Finish 10 workout days',metric:'workouts',target:10}] as const
export function weightForecast(entries:ProgressEntry[],target:number|null,age:number,today:string){
 const unavailable=(reason:string)=>({reason,date:null as string|null,rate:null as number|null,r2:null as number|null})
 if(!Number.isFinite(age)||age<18)return unavailable('A target-date estimate is available only for adults. Your logs and progress charts still work.')
 if(!target||!Number.isFinite(target))return unavailable('Set a target weight to explore your logged trend.')
 const daily=new Map<string,ProgressEntry>();for(const entry of [...entries].sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||'')))if(entry.kind==='body'&&typeof entry.payload.weightKg==='number'&&entry.date<=today&&entry.date>=shiftDate(today,-90))daily.set(entry.date,entry)
 const points=[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date));if(points.length<4)return unavailable('Add at least 4 weight entries on different days spanning 21 days.')
 const first=points[0],last=points[points.length-1],span=(Date.parse(last.date)-Date.parse(first.date))/86400000;if(span<21)return unavailable('Your weight entries need to span at least 21 days.')
 if(last.date<shiftDate(today,-30))return unavailable('Add a recent weight entry; your latest measurement is over 30 days old.')
 const xy=points.map(p=>({x:(Date.parse(p.date)-Date.parse(first.date))/86400000,y:p.payload.weightKg!}));const mx=xy.reduce((n,p)=>n+p.x,0)/xy.length,my=xy.reduce((n,p)=>n+p.y,0)/xy.length;const xx=xy.reduce((n,p)=>n+(p.x-mx)**2,0),yy=xy.reduce((n,p)=>n+(p.y-my)**2,0),slope=xy.reduce((n,p)=>n+(p.x-mx)*(p.y-my),0)/xx;const rate=slope*7,r2=yy?1-xy.reduce((n,p)=>n+(p.y-(my+slope*(p.x-mx)))**2,0)/yy:0
 if(Math.abs(last.payload.weightKg!-target)<0.5)return unavailable('Your latest entry is within 0.5 kg of the target.')
 if(Math.abs(rate)<0.02||r2<0.5)return unavailable('Your recorded trend is too flat or variable for a useful date estimate.')
 if(Math.abs(rate)>1.5)return unavailable('Your recent trend is changing too quickly for this simple projection to be useful.')
 const days=(target-last.payload.weightKg!)/slope;if(days<=0)return unavailable('Your recent trend is moving away from this target.')
 if(days>365)return unavailable('This target is too far away for a useful short-term projection.')
 const projected=shiftDate(last.date,Math.ceil(days));if(projected<=today)return unavailable('The previous trend date has passed. Add a new weight entry.')
 return{reason:'A linear extrapolation of your last 90 days of weight logs, not a promise or a medical forecast. Water, measurement noise and changing habits can shift it.',date:projected,rate:Math.round(rate*100)/100,r2:Math.round(r2*100)/100}
}
