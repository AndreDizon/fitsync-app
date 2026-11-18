import '@/app/content-heading-system.css'
import type { ReactNode } from 'react'
import '@/app/content-title-label.css'

export function ContentTitleLabel({ children }: { children: ReactNode }) {
  return <span className="content-title-label">{children}</span>
}
