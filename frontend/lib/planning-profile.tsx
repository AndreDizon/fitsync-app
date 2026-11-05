'use client'

import { createContext, useContext } from 'react'
import type { OnboardingProfile } from '../../shared/onboarding'

export const PlanningProfileContext = createContext<OnboardingProfile | null>(null)
export const usePlanningProfile = () => useContext(PlanningProfileContext)
