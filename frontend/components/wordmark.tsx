export function Wordmark({ animated = false }: { animated?: boolean }) {
  return <span className={`fitsync-wordmark${animated ? ' wordmark-animated' : ''}`} role="img" aria-label="FitSync">
    {'FitSync'.split('').map((letter, index) => <span key={index} aria-hidden="true" className={`wordmark-letter${index > 2 ? ' wordmark-sync' : ''}`} style={animated ? { animationDelay: `${180 + index * 85}ms` } : undefined}>{letter}</span>)}
  </span>
}
