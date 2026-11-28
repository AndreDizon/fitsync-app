import { storedFoodCatalog as foodCatalog } from './food-catalog'
import { currentDay, currentWeek, type PlanWeek, workoutCatalog } from './daily-plans'
import { dateInZone, milestones, shiftDate, validDate, type Award } from './progress'

export const notificationFeatures = [
  {id:'workoutStart',name:'Workout start',description:'15 minutes before your first unfinished exercise.'},
  {id:'exercise',name:'Scheduled exercises',description:'When an unfinished exercise is due.'},
  {id:'meal',name:'Scheduled meals',description:'When an unfinished food entry is due.'},
  {id:'water',name:'Water reminders',description:'At the times in your daily water log.'},
  {id:'achievement',name:'Achievements',description:'When an unlocked milestone is ready to claim.'},
  {id:'like',name:'Post likes',description:'When someone hearts your forum post.'},
  {id:'comment',name:'Post comments',description:'When someone comments on your post.'},
  {id:'streak',name:'App streak',description:'An evening check-in if you have not visited today.'},
  {id:'gym',name:'Gym updates',description:'Join requests, announcements, sessions, attendance and membership records.'},
  {id:'gymRenewal',name:'Gym renewal reminders',description:'When your recorded gym plan is nearing expiry or has expired.'},
] as const
export type NotificationFeature = typeof notificationFeatures[number]['id']
export type NotificationTarget = {page:'plans'|'progress'|'social';mode?:'workout'|'nutrition';water?:boolean;tab?:'achievements'|'analytics';postId?:string;kind?:'forum'|'people'|'gym';date?:string;gymId?:string;gymTab?:'announcements'|'sessions'|'team'|'attendance'|'membership'}
export type AppNotification = {id:string;feature:NotificationFeature;title:string;body:string;createdAt:string;read:boolean;target:NotificationTarget}
export type NotificationPreferences = Record<NotificationFeature,boolean> & {device:boolean}
export function isNotificationTarget(value:unknown):value is NotificationTarget{
 if(!value||typeof value!=='object')return false
 const target=value as NotificationTarget
 return ['plans','progress','social'].includes(target.page)&&(target.mode===undefined||['workout','nutrition'].includes(target.mode))&&(target.water===undefined||typeof target.water==='boolean')&&(target.tab===undefined||['achievements','analytics'].includes(target.tab))&&(target.date===undefined||validDate(target.date))&&(target.kind===undefined||['forum','people','gym'].includes(target.kind))&&(target.postId===undefined||/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(target.postId))&&(target.gymId===undefined||target.page==='social'&&!target.postId&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(target.gymId))&&(target.gymTab===undefined||!!target.gymId&&['announcements','sessions','team','attendance','membership'].includes(target.gymTab))
}
export const defaultNotificationPreferences:NotificationPreferences = {workoutStart:true,exercise:true,meal:true,water:true,achievement:true,like:true,comment:true,streak:true,gym:true,gymRenewal:true,device:false}
/** Reconcile existing reminders against their exact date and task, not today's day. */
export function completedPlanNotificationIds(items:AppNotification[],week:PlanWeek):string[]{
 return items.filter(item=>{
  if(!['workoutStart','exercise','meal','water'].includes(item.feature)||!item.target.date)return false
  const dayIndex=week.days.findIndex((_,index)=>shiftDate(week.week,index)===item.target.date)
  if(dayIndex<0)return false
  const day=week.days[dayIndex],parts=item.id.split(':'),taskId=parts[2]
  if(parts[1]!==item.target.date)return false
  if(item.feature==='water')return parts[0]==='water'&&/^\d+$/.test(taskId||'')&&day.water[Number(taskId)]?.done===true
  const expected=item.feature==='workoutStart'?'start':item.feature==='exercise'?'exercise':'meal'
  if(parts[0]!==expected)return false
  return (item.feature==='meal'?day.nutrition.items:day.workout.items).some(task=>task.id===taskId&&task.done)
 }).map(item=>item.id)
}
export function scheduledNotifications(week:PlanWeek,zone:string,now:Date,visits:string[],awards:Award[]):AppNotification[]{
  const today=dateInZone(zone,now),day=week.days[currentDay(now,zone)],result:AppNotification[]=[]
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now)
  const minute=Number(parts.find(p=>p.type==='hour')?.value)*60+Number(parts.find(p=>p.type==='minute')?.value)
  const add=(id:string,feature:NotificationFeature,title:string,body:string,target:NotificationTarget)=>result.push({id,feature,title,body,target,read:false,createdAt:now.toISOString()})
  const due=(time:string,lead=0)=>{const [h,m]=time.split(':').map(Number),at=h*60+m-lead;return minute>=Math.max(0,at)&&minute<Math.max(0,at)+15}
  if(week.week===currentWeek(now,zone)&&day){
    const workouts=day.workout.rest?[]:day.workout.items
    const first=[...workouts].sort((a,b)=>a.time.localeCompare(b.time))[0]
    if(first&&!first.done&&due(first.time,15))add(`start:${today}:${first.id}:${first.time}`,'workoutStart','Your workout is coming up',`Your first exercise is scheduled for ${first.time}.`,{page:'plans',mode:'workout',date:today})
    for(const item of workouts)if(!item.done&&due(item.time))add(`exercise:${today}:${item.id}:${item.time}`,'exercise','Time for your next exercise',`${'exerciseId' in item?workoutCatalog.find(e=>e.id===item.exerciseId)?.name||'Exercise':'Exercise'} · ${item.time}`,{page:'plans',mode:'workout',date:today})
    for(const item of day.nutrition.items)if(!item.done&&due(item.time))add(`meal:${today}:${item.id}:${item.time}`,'meal','Your meal is scheduled',`${'foodId' in item?foodCatalog.find(f=>f.id===item.foodId)?.name||item.meal:'Food'} · ${item.time}`,{page:'plans',mode:'nutrition',date:today})
    day.water.forEach((glass,index)=>{if(!glass.done&&due(glass.time))add(`water:${today}:${index}:${glass.time}`,'water','A moment for water',`Glass ${index+1} is scheduled for ${glass.time}. Log it when you drink.`,{page:'plans',water:true,date:today})})
  }
  for(const award of awards)if(!award.claimed_at){const milestone=milestones.find(m=>m.code===award.code);if(milestone)add(`award:${award.code}`,'achievement','An achievement is ready to claim',milestone.name,{page:'progress',tab:'achievements'})}
  if(minute>=1200&&minute<1215&&!visits.includes(today)&&visits.includes(shiftDate(today,-1)))add(`streak:${today}`,'streak','Make a little time for your streak','Open FitSync today to keep your app-use streak going.',{page:'progress',tab:'analytics'})
  return result
}
