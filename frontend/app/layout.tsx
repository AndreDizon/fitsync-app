import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { AppOpening } from '@/components/app-opening'
import './globals.css'
import './theme.css'
import './opening.css'
import './home.css'
import './home-responsive.css'
import './responsive.css'
import './auth.css'

export const metadata: Metadata = {
  title: 'FitSync · Move with intention',
  description: 'A personalized fitness and nutrition companion for building healthier habits.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffd522',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head><link rel="preload" href="/mascot/fox-opening.jpg" as="image" /></head>
      <body className="antialiased">
        <AppOpening>{children}</AppOpening>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
