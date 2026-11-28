'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import '@/app/plan-formulation-skeleton.css'

export function PlanCardPlaceholder() {
  return <div className="plan-skeleton-card" aria-hidden="true">
    <div className="plan-skeleton-heading"><span className="plan-skeleton-block plan-skeleton-art" /><div><span className="plan-skeleton-block plan-skeleton-title" /><span className="plan-skeleton-block plan-skeleton-subtitle" /></div><span className="plan-skeleton-block plan-skeleton-detail" /></div>
    <div className="plan-skeleton-metrics">{[0, 1, 2].map(metric => <div key={metric}><span className="plan-skeleton-block" /><span className="plan-skeleton-block" /></div>)}</div>
    <div className="plan-skeleton-footer"><span className="plan-skeleton-block" /><span className="plan-skeleton-block" /></div>
  </div>
}

export function PlanFormulationSkeleton({ nutrition, ai }: { nutrition: boolean; ai: boolean }) {
  return <div className="plan-formulation-skeleton" data-kind={nutrition ? 'nutrition' : 'workout'}>
    <p role="status" className="plan-formulation-status">{ai ? 'AI is formulating' : 'Formulating'} your {nutrition ? 'meal' : 'workout'} plan?</p>
    <div className="plan-skeleton-cards">{[0, 1, 2].map(index => <PlanCardPlaceholder key={index} />)}</div>
  </div>
}

export function PlanRevealCard({ phase, children }: { phase: 'waiting' | 'flipping' | 'ready'; children: ReactNode }) {
  const scene = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (phase !== 'flipping' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    scene.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  }, [phase])
  return <div className={'plan-reveal-scene is-' + phase} ref={scene} aria-busy={phase !== 'ready'}>
    <div className="plan-reveal-inner">
      <div className="plan-reveal-content" inert={phase !== 'ready'} aria-hidden={phase === 'waiting'}>{children}</div>
      {phase !== 'ready' && <div className="plan-reveal-cover"><PlanCardPlaceholder /></div>}
    </div>
  </div>
}
