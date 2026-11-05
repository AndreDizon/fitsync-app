'use client'

import type { ReactNode } from 'react'
import { HeartPulse } from 'lucide-react'

const silhouette = 'M62 57Q48 55 38 67L27 102 18 144 12 180Q10 190 17 192Q23 192 25 184L34 151 43 120 48 104 51 145 48 177Q43 193 48 216L54 268 55 318 49 337Q47 343 57 343L69 343Q75 343 74 334L72 317 78 263 80 229 82 263 88 317 86 334Q85 343 91 343L103 343Q113 343 111 337L105 318 106 268 112 216Q117 193 112 177L109 145 112 104 117 120 126 151 135 184Q137 192 143 192Q150 190 148 180L142 144 133 102 122 67Q112 55 98 57L92 55 68 55Z'
function Pair({ d }: { d: string }) {
  return <><path d={d} /><path d={d} transform="translate(160 0) scale(-1 1)" /></>
}
function BodyFigure({ back, selected }: { back?: boolean; selected: string[] }) {
  const overall = selected.includes('Overall')
  const region = (name: string, children: ReactNode) => <g className={`focus-muscle${overall || selected.includes(name) ? ' is-selected' : ''}`} data-region={name} data-selected={overall || selected.includes(name)}>{children}</g>
  return <svg viewBox="0 0 160 355" className={`focus-body${overall ? ' is-overall' : ''}`} aria-hidden="true">
    <ellipse className="focus-body-ground" cx="80" cy="347" rx="42" ry="4" />
    <g className="focus-body-silhouette"><ellipse cx="80" cy="26" rx="17" ry="22" /><path d="M72 46V58H88V46" /><path d={silhouette} /></g>
    {region('Shoulders', <Pair d="M57 61Q43 60 38 75L35 88 48 93 56 78Z" />)}
    {region('Arms', <><Pair d="M36 94L46 98 40 127 32 142 25 139 29 113Z" /><Pair d="M24 145L31 150 23 177 17 182 18 171Z" /></>)}
    {back ? <>
      {region('Back', <><Pair d="M68 58L60 65 55 87 76 104 78 70Z" /><Pair d="M54 93L76 111 77 162 63 153 55 129Z" /><path d="M68 157L80 168 92 157 104 174 98 181H62L56 174Z" /></>)}
      {region('Core', <Pair d="M54 135L62 154 62 169 55 173 53 159Z" />)}
      {region('Legs', <><Pair d="M54 181Q66 178 77 188L76 208Q64 221 53 210Z" /><Pair d="M53 218Q65 226 75 216L71 254 64 269 57 254Z" /><Pair d="M58 274L67 273 70 296 67 316 60 318 58 300Z" /></>)}
      <path className="focus-body-detail" d="M80 65V156M80 182V209" />
    </> : <>
      {region('Chest', <Pair d="M58 77Q68 73 77 81L77 105Q68 110 56 102L53 91Z" />)}
      {region('Core', <><Pair d="M66 113L77 112V125H65Z" /><Pair d="M65 130H77V143H65Z" /><Pair d="M65 148H77V163L68 161Z" /><Pair d="M55 112L61 117 60 153 67 168 60 173 54 150Z" /></>)}
      {region('Legs', <><Pair d="M54 182L67 178 76 193 74 218 68 251 62 258 55 240 51 211Z" /><Pair d="M57 272L67 270 71 286 67 316 60 316Z" /></>)}
      <path className="focus-body-detail" d="M64 67L77 71M96 67L83 71M58 265H68M92 265H102M65 173L80 182 95 173" />
      {(overall || selected.includes('Cardio')) && <g className="focus-cardio-marker"><circle cx="80" cy="94" r="12" /><path d="M80 100L74 94C69 89 76 84 80 90 84 84 91 89 86 94Z" /></g>}
    </>}
  </svg>
}

export function BodyFocusMap({ selected }: { selected: string[] }) {
  const overall = selected.includes('Overall')
  const cardio = overall || selected.includes('Cardio')
  const label = overall ? 'Overall · balanced full body' : selected.length ? selected.join(' · ') : 'Choose an area to highlight'
  return <figure className="onb-body-map" aria-label={`Body focus preview: ${label}`}>
    <div className="focus-map-header"><div><span>YOUR MOVEMENT MAP</span><strong>See your focus.</strong></div><span className="focus-map-key"><i />Selected</span></div>
    <div className="focus-map-figures"><div><BodyFigure selected={selected} /><span>FRONT</span></div><div><BodyFigure back selected={selected} /><span>BACK</span></div></div>
    <figcaption><p aria-live="polite" aria-atomic="true">{label}</p><span className={cardio ? 'focus-cardio-caption active' : 'focus-cardio-caption'}><HeartPulse size={14} aria-hidden="true" />{cardio ? 'Cardio supports whole-body conditioning' : 'Highlights follow your selections'}</span></figcaption>
  </figure>
}
