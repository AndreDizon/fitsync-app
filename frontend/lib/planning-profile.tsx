'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { readCompletedOnboarding, type OnboardingProfile } from '../../shared/onboarding'

export const PlanningProfileContext = createContext<OnboardingProfile | null>(null)
export const usePlanningProfile = () => useContext(PlanningProfileContext)

export function PlanningProfileProvider({profile,children}:{profile:OnboardingProfile;children:ReactNode}){const[current,setCurrent]=useState(profile);useEffect(()=>setCurrent(profile),[profile]);useEffect(()=>{const update=(event:Event)=>{const next=readCompletedOnboarding((event as CustomEvent).detail);if(next)setCurrent(next)};window.addEventListener('fitsync-profile-updated',update);return()=>window.removeEventListener('fitsync-profile-updated',update)},[]);return <PlanningProfileContext.Provider value={current}>{children}</PlanningProfileContext.Provider>}
