'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import '@/app/plan-task-disclosure.css'

export function PlanTaskDisclosure({ name, nutrition, children }: { name: string; nutrition: boolean; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  return <details className="plan-task-disclosure" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary aria-label={(expanded ? 'Collapse details for ' : 'Expand details for ') + name}><SlidersHorizontal size={15} aria-hidden="true" /><span>{expanded ? 'Close details' : nutrition ? 'Edit portion & more' : 'Edit & log'}</span><ChevronDown size={17} aria-hidden="true" /></summary>
    <div className="plan-task-disclosure-body">{children}</div>
  </details>
}
