'use client'

import { createContext, useContext, useRef, type ReactNode } from 'react'
const Context = createContext<{ current: () => boolean | Promise<boolean> } | null>(null)
export function PlaylistNavigationProvider({ children }: { children: ReactNode }) {
  const guard = useRef<() => boolean | Promise<boolean>>(() => true)
  return <Context.Provider value={guard}>{children}</Context.Provider>
}
export const usePlaylistNavigation = () => useContext(Context)
