export function FooterSocialIcon({ platform }: { platform: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    {platform === 'Instagram' ? <><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor"/></>
      : platform === 'Facebook' ? <path d="M14.5 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.8 1.8-1.8H18V2.3c-.7-.1-1.7-.3-2.8-.3C12.4 2 10.5 3.7 10.5 7v2.5H7.5V13h3v9Z" fill="currentColor"/>
        : platform === 'X' ? <path d="M4 3h4.5L20 21h-4.5ZM20 3 4 21" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        : platform === 'LinkedIn' ? <><circle cx="5" cy="5" r="1.8" fill="currentColor"/><path d="M3.5 9v12M10 21V9m0 5c0-7 10-7 10 0v7" stroke="currentColor" strokeWidth="3"/></>
        : platform === 'TikTok' ? <path d="M14 3v13a5 5 0 1 1-5-5m5-8c0 5 4 6 7 6" stroke="currentColor" strokeWidth="3"/>
        : <><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor"/><path d="m10 8.5 6 3.5-6 3.5Z" fill="#f00"/></>}
  </svg>
}
