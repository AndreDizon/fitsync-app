'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePlanAccount } from './playlist-account'
import { usePlanningProfile } from './planning-profile'
import { cachedWeek, syncWeek } from './daily-plans'
import { cachedProgress, loadProgress, pendingVisits } from './progress'
import { currentWeek } from '../../shared/daily-plans'
import { dateInZone, validDate } from '../../shared/progress'
import { defaultNotificationPreferences, notificationFeatures, scheduledNotifications, isNotificationTarget, completedPlanNotificationIds, type AppNotification, type NotificationFeature, type NotificationPreferences, type NotificationTarget } from '../../shared/notifications'
import { gymRequest } from './gym-groups'
export type { AppNotification, NotificationFeature, NotificationTarget }
type Stored={items:AppNotification[];seen:string[];preferences:NotificationPreferences;socialCursor:string;socialViews:Record<string,{like?:string;comment?:string}>}
const blank=():Stored=>({items:[],seen:[],preferences:{...defaultNotificationPreferences},socialCursor:'',socialViews:{}})
const prefix='fitsync-private-notifications:'
export function clearNotificationCopies(){try{for(const key of Object.keys(localStorage))if(key.startsWith(prefix))localStorage.removeItem(key)}catch{}}
function read(owner:string):Stored{try{const raw=JSON.parse(localStorage.getItem(prefix+owner)||'null');if(!raw)return blank();return {items:Array.isArray(raw.items)?raw.items.filter((n:AppNotification)=>n&&typeof n.id==='string'&&typeof n.title==='string'&&typeof n.createdAt==='string'&&Number.isFinite(Date.parse(n.createdAt))&&typeof n.body==='string'&&notificationFeatures.some(f=>f.id===n.feature)&&isNotificationTarget(n.target)):[],seen:Array.isArray(raw.seen)?raw.seen.filter((id:unknown)=>typeof id==='string'):[],preferences:Object.fromEntries(Object.entries(defaultNotificationPreferences).map(([key,value])=>[key,typeof raw.preferences?.[key]==='boolean'?raw.preferences[key]:value])) as NotificationPreferences,socialCursor:typeof raw.socialCursor==='string'?raw.socialCursor:'',socialViews:raw.socialViews&&typeof raw.socialViews==='object'&&!Array.isArray(raw.socialViews)?raw.socialViews:{}}}catch{return blank()}}
const Context=createContext<null|{items:AppNotification[];preferences:NotificationPreferences;setFeature:(feature:NotificationFeature,value:boolean)=>void;clear:()=>void;remove:(id:string)=>void;markRead:(id:string)=>void;deviceStatus:string;deviceBusy:boolean;requestDevice:()=>Promise<void>;disableDevice:()=>void;socialError:string;refresh:()=>void;zone:string}>(null)
export function useNotifications(){const context=useContext(Context);if(!context)throw new Error('Notification provider is missing');return context}
export function NotificationProvider({children}:{children:ReactNode}){
 const identity=usePlanAccount(),owner=identity||'local-tester',profile=usePlanningProfile(),zone=profile?.timeZone||'Asia/Manila'
 const [state,setState]=useState<Stored>(blank),[deviceStatus,setDeviceStatus]=useState('Not enabled'),[deviceBusy,setDeviceBusy]=useState(false),[socialError,setSocialError]=useState(''),[refresh,setRefresh]=useState(0)
 const [gymError,setGymError]=useState('')
 const current=useRef(state),generation=useRef(0),currentOwner=useRef(owner),registration=useRef<ServiceWorkerRegistration|null>(null)
 const update=useCallback((change:(value:Stored)=>Stored)=>{if(currentOwner.current!==owner)return;const next=change(current.current);current.current=next;setState(next);try{localStorage.setItem(prefix+owner,JSON.stringify(next))}catch{}},[owner])
 const removeCompleted=useCallback(()=>{
  if(currentOwner.current!==owner)return
  const weeks=new Set(current.current.items.map(item=>item.target.date).filter(validDate).map(date=>currentWeek(new Date(date+'T12:00:00Z'),'UTC')))
  const completed=new Set([...weeks].flatMap(week=>completedPlanNotificationIds(current.current.items,cachedWeek(owner,week).document)))
  if(!completed.size)return
  update(value=>({...value,items:value.items.filter(item=>!completed.has(item.id))}))
  void registration.current?.getNotifications().then(alerts=>alerts.forEach(alert=>{if(completed.has(alert.tag.replace(/^fitsync:/,'')))alert.close()})).catch(()=>{})
 },[owner,update])
 useEffect(()=>{currentOwner.current=owner;generation.current++;const next=read(owner);current.current=next;setState(next);setSocialError('');const changed=(event:StorageEvent)=>{if(event.key===prefix+owner){const next=read(owner);current.current=next;setState(next)}};window.addEventListener('storage',changed);return()=>{generation.current++;window.removeEventListener('storage',changed)}},[owner])
 useEffect(()=>{removeCompleted();const changed=(event:Event)=>{if((event as CustomEvent).detail?.owner===owner)removeCompleted()};const storage=(event:StorageEvent)=>{if(event.key?.startsWith('fitsync-private-daily-plan:'+owner+':')||event.key===prefix+owner)removeCompleted()};window.addEventListener('fitsync-plan-updated',changed);window.addEventListener('storage',storage);return()=>{window.removeEventListener('fitsync-plan-updated',changed);window.removeEventListener('storage',storage)}},[owner,removeCompleted])
 useEffect(()=>{const claimed=(event:Event)=>{const code=(event as CustomEvent).detail;if(typeof code==='string')update(value=>({...value,items:value.items.filter(item=>item.id!=='award:'+code),seen:[...new Set([...value.seen,'award:'+code])]}))};window.addEventListener('fitsync-award-claimed',claimed);return()=>window.removeEventListener('fitsync-award-claimed',claimed)},[update])
 useEffect(()=>{const viewed=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.owner!==owner||typeof detail.postId!=='string')return;const at=new Date().toISOString();const removed=current.current.items.filter(item=>item.target.page==='social'&&item.target.postId===detail.postId&&(item.feature==='like'||detail.comments===true&&item.feature==='comment')).map(item=>item.id);const ids=new Set(removed);update(value=>({...value,items:value.items.filter(item=>!ids.has(item.id)),seen:[...new Set([...value.seen,...removed])],socialViews:{...value.socialViews,[detail.postId]:{...value.socialViews[detail.postId],like:at,...(detail.comments===true?{comment:at}:{})}}}));void registration.current?.getNotifications().then(alerts=>alerts.forEach(alert=>{if(ids.has(alert.tag.replace(/^fitsync:/,'')))alert.close()})).catch(()=>{})};window.addEventListener('fitsync-social-post-seen',viewed);return()=>window.removeEventListener('fitsync-social-post-seen',viewed)},[owner,update])
 const deliver=useCallback((items:AppNotification[],background=false)=>{
  const fresh:AppNotification[]=[]
  update(value=>{const seen=new Set(value.seen),existing=new Set(value.items.map(n=>n.id));for(const item of items){if(!value.preferences[item.feature]||seen.has(item.id)||existing.has(item.id))continue;seen.add(item.id);existing.add(item.id);const viewedAt=item.target.postId&&(item.feature==='like'||item.feature==='comment')?value.socialViews[item.target.postId]?.[item.feature]:undefined;if(viewedAt&&item.createdAt<=viewedAt)continue;fresh.push(item)}return {...value,seen:[...seen],items:[...fresh,...value.items].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,200)}})
  if(background&&current.current.preferences.device&&typeof Notification!=='undefined'&&Notification.permission==='granted')for(const item of fresh.slice(0,3)){const options={body:item.body,tag:'fitsync:'+item.id,icon:'/mascot/optimized/fox-logo-192.webp',data:{target:item.target,id:item.id}};if(registration.current)void registration.current.showNotification(item.title,options).catch(()=>{});else try{const notice=new Notification(item.title,options);notice.onclick=()=>{update(value=>({...value,items:value.items.map(n=>n.id===item.id?{...n,read:true}:n)}));window.focus();window.dispatchEvent(new CustomEvent('fitsync-notification-open',{detail:item.target}));notice.close()}}catch{}}
 },[update])
 useEffect(()=>{
  if(!identity){setGymError('');return}
  let active=true,running=false,loaded=false;const started=generation.current,abort=new AbortController()
  setGymError('')
  const tick=async()=>{
   if(!active||running||currentOwner.current!==owner||!navigator.onLine||!current.current.preferences.gym&&!current.current.preferences.gymRenewal)return
   running=true
   try{
    const data=await gymRequest('notifications',{},AbortSignal.any([abort.signal,AbortSignal.timeout(15000)]))
    if(!active||generation.current!==started)return
    if(data.userId!==owner)throw new Error('Account changed. Refresh gym notifications.')
    const incoming:AppNotification[]=(data.notifications||[]).map((row:{id:string;feature:'gym'|'gymRenewal';title:string;body:string;gym_id:string;gym_tab:NotificationTarget['gymTab'];created_at:string})=>({id:'gym:'+row.id,feature:row.feature,title:row.title,body:row.body,createdAt:row.created_at,read:false,target:{page:'social',gymId:row.gym_id,gymTab:row.gym_tab}}))
    const valid=incoming.filter(item=>isNotificationTarget(item.target)),ids=new Set(valid.map(item=>item.id))
    update(value=>({...value,items:value.items.filter(item=>!item.id.startsWith('gym:')||ids.has(item.id))}))
    deliver(valid,loaded);loaded=true;setGymError('')
   }catch(e){if(active&&!abort.signal.aborted)setGymError((e as Error).message)}finally{running=false}
  }
  void tick();const timer=setInterval(()=>void tick(),60000)
  const resumed=()=>{if(document.visibilityState==='visible')void tick()}
  const changed=(event:Event)=>{if((event as CustomEvent).detail?.owner===owner)void tick()}
  window.addEventListener('online',resumed);window.addEventListener('focus',resumed);document.addEventListener('visibilitychange',resumed);window.addEventListener('fitsync-gym-updated',changed)
  return()=>{active=false;abort.abort();clearInterval(timer);window.removeEventListener('online',resumed);window.removeEventListener('focus',resumed);document.removeEventListener('visibilitychange',resumed);window.removeEventListener('fitsync-gym-updated',changed)}
 },[identity,owner,deliver,update,refresh])
 useEffect(()=>{if(typeof Notification==='undefined'){setDeviceStatus('Device notifications are not supported by this browser');return}setDeviceStatus(Notification.permission==='denied'?'Blocked in browser settings':current.current.preferences.device&&Notification.permission==='granted'?'Enabled while FitSync is open':'Not enabled');if(Notification.permission==='granted'&&current.current.preferences.device&&'serviceWorker' in navigator)navigator.serviceWorker.getRegistration('/notifications/').then(value=>{registration.current=value||null}).catch(()=>{})},[state.preferences.device,owner])
 useEffect(()=>{
  let active=true,running=false;const started=generation.current
  const tick=async()=>{if(!active||running||currentOwner.current!==owner)return;running=true;try{
   removeCompleted()
   const now=new Date(),week=currentWeek(now,zone),local=cachedWeek(owner,week),saved=cachedProgress(owner)
   deliver(scheduledNotifications(local.document,zone,now,[...(saved?.visits||[]),...pendingVisits(owner),...(document.visibilityState==='visible'?[dateInZone(zone,now)]:[])],saved?.awards||[]),true)
   if(identity&&navigator.onLine){
    await syncWeek(owner,week).catch(()=>null)
    const progress=await loadProgress(owner).catch(()=>null)
    if(!active||generation.current!==started)return
    if(progress)update(value=>({...value,items:value.items.filter(item=>item.feature!=='achievement'||!progress.awards.some(award=>item.id==='award:'+award.code&&award.claimed_at))}));
    deliver(scheduledNotifications(cachedWeek(owner,week).document,zone,new Date(),[...(progress?.visits||[]),...pendingVisits(owner),...(document.visibilityState==='visible'?[dateInZone(zone)]:[])],progress?.awards||[]),true)
    if(current.current.preferences.like||current.current.preferences.comment){try{const response=await fetch('/api/notifications',{cache:'no-store',signal:AbortSignal.timeout(15000)}),data=await response.json();if(!response.ok)throw new Error(data.error||'Social notifications could not refresh.');if(data.userId!==owner)throw new Error('Account changed.');if(!active||generation.current!==started)return;setSocialError('');const cursor=current.current.socialCursor;const rows=(data.notifications||[]) as {id:string;feature:'like'|'comment';title:string;body:string;post_id:string;kind:'forum'|'people'|'gym';created_at:string}[];const incoming=rows.map(row=>({id:'social:'+row.id,feature:row.feature,title:row.title,body:row.body,createdAt:row.created_at,read:false,target:{page:'social' as const,postId:row.post_id,kind:row.kind}}));deliver(incoming,!!cursor);update(value=>({...value,socialCursor:new Date().toISOString()}))}catch(error){if(active)setSocialError((error as Error).message)}}
   }
  }finally{running=false}}
  void tick();const timer=setInterval(()=>void tick(),60000);const resumed=()=>{if(document.visibilityState==='visible')void tick()};window.addEventListener('online',resumed);window.addEventListener('focus',resumed);document.addEventListener('visibilitychange',resumed)
  return()=>{active=false;clearInterval(timer);window.removeEventListener('online',resumed);window.removeEventListener('focus',resumed);document.removeEventListener('visibilitychange',resumed)}
 },[owner,identity,zone,deliver,update,refresh,removeCompleted])
 async function requestDevice(){setDeviceBusy(true);try{if(typeof Notification==='undefined'||!window.isSecureContext){setDeviceStatus('Device alerts need a supported browser and a secure connection.');return}if(Notification.permission==='denied'){setDeviceStatus('Blocked. Allow notifications for FitSync in browser settings.');return}const result=await Notification.requestPermission();if(result==='granted'){if('serviceWorker' in navigator)try{registration.current=await navigator.serviceWorker.register('/notifications-sw.js',{scope:'/notifications/'})}catch{}update(value=>({...value,preferences:{...value.preferences,device:true}}));setDeviceStatus('Enabled while FitSync is open')}else setDeviceStatus(result==='denied'?'Permission denied. In-app notifications still work.':'Permission was not granted. In-app notifications still work.')}catch{setDeviceStatus('Could not enable device alerts. In-app notifications still work.')}finally{setDeviceBusy(false)}}
 return <Context.Provider value={{items:currentOwner.current===owner?state.items:[],preferences:state.preferences,setFeature:(feature,value)=>{update(stored=>({...stored,preferences:{...stored.preferences,[feature]:value}}));setRefresh(n=>n+1)},clear:()=>update(value=>({...value,items:[]})),remove:id=>update(value=>({...value,items:value.items.filter(n=>n.id!==id)})),markRead:id=>update(value=>({...value,items:value.items.map(n=>n.id===id?{...n,read:true}:n)})),deviceStatus,deviceBusy,requestDevice,disableDevice:()=>update(value=>({...value,preferences:{...value.preferences,device:false}})),socialError:[socialError,gymError].filter(Boolean).join(' '),refresh:()=>setRefresh(n=>n+1),zone}}>{children}</Context.Provider>
}
