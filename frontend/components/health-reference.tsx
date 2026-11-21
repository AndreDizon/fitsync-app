import { BookOpen, ChevronDown } from 'lucide-react'
import { healthSources } from '@/lib/health-guidance'
import '@/app/health-reference.css'

export function HealthReference({ title, children, sources, className = '' }: {
  title: React.ReactNode; children: React.ReactNode; sources: (keyof typeof healthSources)[]; className?: string;
}) {
  return <details className={`health-reference ${className}`}>
    <summary><BookOpen size={17} aria-hidden="true" /><span>{title}</span><ChevronDown size={16} aria-hidden="true" /></summary>
    <div className="health-reference-body">{children}<div className="health-reference-sources"><span>Read the references</span>{sources.map(key => <a key={key} href={healthSources[key].url} target="_blank" rel="noreferrer">{healthSources[key].name}<span className="sr-only"> (opens in a new tab)</span></a>)}</div><small>General education. References do not imply endorsement or professional certification of FitSync.</small></div>
  </details>
}
