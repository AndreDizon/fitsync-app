'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Wordmark } from '@/components/wordmark'

export function AppOpening({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<'opening' | 'leaving' | 'done'>('opening')

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase('leaving'), 2700)
    const finishTimer = window.setTimeout(() => setPhase('done'), 3000)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(finishTimer)
    }
  }, [])

  useEffect(() => {
    if (phase === 'done') return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [phase])

  return <>
    {phase !== 'done' && <div className={`app-opening ${phase === 'leaving' ? 'app-opening-leaving' : ''}`}>
      <div className="opening-track" aria-hidden="true" />
      <div className="opening-content" role="status" aria-label="Opening FitSync. Get ready to move.">
        <div className="opening-mascot-stage" aria-hidden="true">
          <span className="opening-orbit" />
          <span className="opening-spark spark-left">✦</span>
          <span className="opening-spark spark-right">✦</span>
          <div className="opening-mascot" />
          <span className="opening-shadow" />
          <span className="opening-badge">LET'S GO!</span>
        </div>
        <h1 className="opening-wordmark" aria-hidden="true"><Wordmark animated /></h1>
        <p className="opening-tagline" aria-hidden="true">Find your rhythm. Fuel your day.</p>
        <div className="opening-loader" aria-hidden="true"><span /><span /><span /></div>
        <span className="opening-caption" aria-hidden="true">A little stronger, together.</span>
      </div>
      <span className="opening-footer" aria-hidden="true">MOVE / FUEL / RECOVER</span>
    </div>}
    <div inert={phase !== 'done'} aria-hidden={phase !== 'done' ? true : undefined}>{children}</div>
  </>
}
