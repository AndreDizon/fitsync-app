type JournalArt = 'body' | 'wellness' | 'history' | 'photos'

/** Decorative instrument marks; these never represent a user's measurements. */
export function JournalHeaderArt({ variant }: { variant: JournalArt }) {
  return <span className={'pj-header-art pj-header-art-' + variant} aria-hidden="true"><svg viewBox="0 0 440 120" fill="none" preserveAspectRatio="xMaxYMid slice">
    {variant === 'body' && <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M-20 101H125c63 0 63-66 126-66h209M-20 113H137c63 0 63-66 126-66h197M-20 89H113c63 0 63-66 126-66h221"/>
      <path d="M244 9H430M244 8V17M275 8V23M306 8V17M337 8V23M368 8V17M399 8V23M430 8V17"/>
    </g>}
    {variant === 'wellness' && <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M-30 45C35 45 35 100 100 100S165 15 230 15s65 66 130 66 65-36 110-36M-30 58C35 58 35 113 100 113S165 28 230 28s65 66 130 66 65-36 110-36M-30 32C35 32 35 87 100 87S165 2 230 2s65 66 130 66 65-36 110-36"/>
      <path d="M345 12H430M366 18H430M387 24H430"/>
    </g>}
    {variant === 'history' && <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-20 95H112c24 0 24-45 48-45h70c24 0 24 40 48 40h182M-20 106H123c24 0 24-45 48-45h48c24 0 24 40 48 40h193M170 50V19h127c22 0 22 25 44 25h119M297 19V-10"/>
      <circle cx="170" cy="50" r="4"/><circle cx="297" cy="19" r="4"/><circle cx="341" cy="44" r="4"/><path d="M368 78v24M390 78v24M412 78v24"/>
    </g>}
    {variant === 'photos' && <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-20 108H155c65 0 65-94 130-94h175M-20 119H166c65 0 65-94 130-94h164M267 48V35h23M395 35h23v13M418 87v13h-23M290 100h-23V87"/>
      <path d="M333 65h18M342 56v18M434 36v9M434 57v9M434 78v9"/>
    </g>}
  </svg></span>
}
