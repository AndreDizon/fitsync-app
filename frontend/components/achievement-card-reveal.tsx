'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { Award } from 'lucide-react'
import { achievementFrameShape } from './achievement-emblem'

export function AchievementCardReveal({ source, alt, stage, failed, category }: {
  source: string; alt: string; stage: string; failed: boolean; category: Parameters<typeof achievementFrameShape>[0]
}) {
  const [ready, setReady] = useState(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null), id = useId().replace(/:/g, '')
  useEffect(() => { setReady(false); return () => { if (timer.current) clearTimeout(timer.current) } }, [source])
  return <div className={'ach-flip-scene' + (ready ? ' is-ready' : '')} aria-busy={!ready && !failed}>
    <div className="ach-flip-card">
      <div className="ach-flip-back" aria-hidden={ready}>
        <span className="ach-card-brand">FitSync</span><Award size={50} strokeWidth={1.5} aria-hidden="true"/>
        <div role={ready ? undefined : 'status'} aria-live="polite"><strong>{failed ? 'Your achievement is safe' : stage}</strong><p>{failed ? 'Use the retry button below to prepare your card.' : 'Your win is saved. Preparing its share card.'}</p></div>
        <span className="ach-card-back-caption">YOUR MILESTONE. YOUR PACE.</span>
      </div>
      <div className="ach-flip-front" aria-hidden={!ready}>
        {source && <img className="ach-share-image" src={source} width={1080} height={1350} alt={alt} decoding="async" onLoad={() => { timer.current = setTimeout(() => setReady(true), 180) }}/ >}
        {ready && <svg className="ach-emblem-shine" viewBox="0 0 140 156" fill="none" aria-hidden="true"><defs><clipPath id={id + '-shine-clip'}><path d={achievementFrameShape(category)}/></clipPath><linearGradient id={id + '-shine-light'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff" stopOpacity="0"/><stop offset=".5" stopColor="#fff" stopOpacity=".75"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient></defs><g clipPath={'url(#' + id + '-shine-clip)'}><rect className="ach-shine-band" x="0" y="-55" width="140" height="55" fill={'url(#' + id + '-shine-light)'}/></g></svg>}
      </div>
    </div>
    {ready && <div className="ach-card-confetti" aria-hidden="true">{Array.from({length:22},(_,index) => <i key={index} style={{'--piece-x': index % 2 ? '96%' : '4%', '--piece-drift': ((index % 2 ? -1 : 1) * (35 + Math.floor(index / 2) % 6 * 13)) + 'px', '--piece-rise': (105 + index % 7 * 17) + 'px', '--piece-turn': (180 + index * 49) + 'deg', '--piece-delay': (index % 6 * .045) + 's', '--piece-color': ['#ffe135','#ff923f','#9bc4f1','#e6acd0','#bda5df'][index % 5]} as CSSProperties}/>)}</div>}
  </div>
}
