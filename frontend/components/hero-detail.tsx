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
  </div>
}
