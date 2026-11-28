'use client'

import { useState } from 'react'
import { articlePublisherIcons } from '@/lib/article-publishers'

export function ArticlePublisherIcon({ source }: { source: string }) {
  const icon = articlePublisherIcons[source]
  const [failed, setFailed] = useState(false)
  return <span className="sc-learning-publisher-icon" aria-hidden="true">
    {icon && !failed
      ? <img src={`/article-publishers/${icon.file}.png`} alt="" width={32} height={32} decoding="async" onError={() => setFailed(true)} />
      : <span>{icon?.initials || source.slice(0, 3)}</span>}
  </span>
}
