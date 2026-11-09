/** Decorative editorial footer; these are themes, not user statistics. */
export function HeroDetail({ variant }: { variant: 'home' | 'plans' | 'social' | 'progress' }) {
  const labels = {
    home: ['MOVE', 'FUEL', 'FEEL GOOD'],
    plans: ['YOUR GOALS', 'YOUR PACE'],
    social: ['SHARE', 'CONNECT', 'BELONG'],
    progress: ['SMALL STEPS', 'LASTING HABITS'],
  }
  return <div className={`compact-hero-detail detail-${variant}`} aria-hidden="true">
    <div>{labels[variant].map(label => <span key={label}>{label}</span>)}</div>
    <svg viewBox="0 0 160 24" fill="none"><path d="M1 21H28L42 12L55 17L76 4L92 12L111 7L126 11L145 2H159" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="145" cy="2" r="2" fill="currentColor"/></svg>
  </div>
}
