'use client'
import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { dateInZone } from '../../shared/progress'
import { clearNotificationCopies } from './notifications'
import { clearProgressCopies, recordAppVisit, syncProgressVisits } from './progress'
import { clearDailyPlanCopies } from './daily-plans'
import { supabase } from './supabase'
import { clearOfflinePlaylists, setPlaylistAccount, syncPlaylists, listPlaylists } from './playlists'

const AccountContext = createContext<string | null>(null)
export const usePlanAccount = () => useContext(AccountContext)
export function PlaylistAccountProvider({ id, dataEpoch = 0, timeZone = 'Asia/Manila', children }: { id: string | null; dataEpoch?: number; timeZone?: string; children: ReactNode }) {
  const [prepared, setPrepared] = useState(dataEpoch === 0)
  useLayoutEffect(() => {
    if (!id || !dataEpoch) return
    let active = true
    const key = 'fitsync-account-data-epoch:' + id
    const prepare = async () => {
      let previous = ''
      try { previous = localStorage.getItem(key) || '' } catch {}
      if (previous !== String(dataEpoch)) {
        clearNotificationCopies(); clearProgressCopies(); clearDailyPlanCopies()
        await clearOfflinePlaylists()
        try { localStorage.setItem(key, String(dataEpoch)) } catch {}
      }
      if (active) setPrepared(true)
    }
    void prepare().catch(() => { if (active) setPrepared(false) })
    return () => { active = false }
  }, [id, dataEpoch])
  useEffect(() => {
    if (!prepared) return
    setPlaylistAccount(id)
    const reconnect = () => { if (id) {
      void syncPlaylists().then(() => Promise.allSettled([listPlaylists('workout'), listPlaylists('nutrition')])).catch(() => {})
    } }
    if (navigator.onLine) reconnect()
    window.addEventListener('online', reconnect)
    let lastVisit=''
    const visit=()=>{if(!id||document.visibilityState!=='visible')return;const day=dateInZone(timeZone);if(lastVisit!==day){recordAppVisit(id,day);lastVisit=day}if(navigator.onLine)void syncProgressVisits(id).catch(()=>{})}
    visit();const visitTimer=setInterval(visit,60000);window.addEventListener('online',visit);document.addEventListener('visibilitychange',visit)
    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { clearNotificationCopies(); clearProgressCopies(); clearDailyPlanCopies(); void clearOfflinePlaylists().catch(() => {}) }
      else if (session) setPlaylistAccount(session.user.id)
    })
    return () => { clearInterval(visitTimer); document.removeEventListener('visibilitychange',visit); window.removeEventListener('online',visit); window.removeEventListener('online', reconnect); subscription?.data.subscription.unsubscribe(); setPlaylistAccount(null) }
  }, [id,timeZone,prepared])
  if (!prepared) return <p role="status">Preparing your account...</p>
  return <AccountContext.Provider value={id}>{children}</AccountContext.Provider>
}
