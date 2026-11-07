'use client'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { clearDailyPlanCopies } from './daily-plans'
import { supabase } from './supabase'
import { clearOfflinePlaylists, setPlaylistAccount, syncPlaylists } from './playlists'

const AccountContext = createContext<string | null>(null)
export const usePlanAccount = () => useContext(AccountContext)
export function PlaylistAccountProvider({ id, children }: { id: string | null; children: ReactNode }) {
  useEffect(() => {
    setPlaylistAccount(id)
    const reconnect = () => { if (id) void syncPlaylists().catch(() => {}) }
    if (navigator.onLine) reconnect()
    window.addEventListener('online', reconnect)
    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { clearDailyPlanCopies(); void clearOfflinePlaylists().catch(() => {}) }
      else if (session) setPlaylistAccount(session.user.id)
    })
    return () => { window.removeEventListener('online', reconnect); subscription?.data.subscription.unsubscribe(); setPlaylistAccount(null) }
  }, [id])
  return <AccountContext.Provider value={id}>{children}</AccountContext.Provider>
}
