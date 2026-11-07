'use client'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { dateInZone } from '../../shared/progress'
import { clearProgressCopies, recordAppVisit, syncProgressVisits } from './progress'
import { clearDailyPlanCopies } from './daily-plans'
import { supabase } from './supabase'
import { clearOfflinePlaylists, setPlaylistAccount, syncPlaylists, listPlaylists } from './playlists'

const AccountContext = createContext<string | null>(null)
export const usePlanAccount = () => useContext(AccountContext)
export function PlaylistAccountProvider({ id, timeZone = 'Asia/Manila', children }: { id: string | null; timeZone?: string; children: ReactNode }) {
  useEffect(() => {
    setPlaylistAccount(id)
    const reconnect = () => { if (id) {
      void syncPlaylists().then(() => Promise.allSettled([listPlaylists('workout'), listPlaylists('nutrition')])).catch(() => {})
    } }
    if (navigator.onLine) reconnect()
    window.addEventListener('online', reconnect)
    let lastVisit=''
    const visit=()=>{if(!id)return;const day=dateInZone(timeZone);if(lastVisit!==day){recordAppVisit(id,day);lastVisit=day}if(navigator.onLine)void syncProgressVisits(id).catch(()=>{})}
    visit();const visitTimer=setInterval(visit,60000);window.addEventListener('online',visit)
    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { clearProgressCopies(); clearDailyPlanCopies(); void clearOfflinePlaylists().catch(() => {}) }
      else if (session) setPlaylistAccount(session.user.id)
    })
    return () => { clearInterval(visitTimer); window.removeEventListener('online',visit); window.removeEventListener('online', reconnect); subscription?.data.subscription.unsubscribe(); setPlaylistAccount(null) }
  }, [id,timeZone])
  return <AccountContext.Provider value={id}>{children}</AccountContext.Provider>
}
