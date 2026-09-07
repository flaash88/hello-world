import type { Metadata, Viewport } from 'next'
import './globals.css'
import { DEFAULT_LOCALE } from '@/lib/i18n'
import { LEISTE_NACHT, LEISTE_TAG } from '@/lib/pwa/statusleiste'

export const metadata: Metadata = {
  title: { default: 'Sprössling', template: '%s · Sprössling' },
  description: 'Schwangerschaft, Schlaf und Alltag – für uns zwei.',
  applicationName: 'Sprössling',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Sprössling' },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
  },
  robots: { index: false, follow: false },
  other: {
    // Titel, Statusleiste und `mobile-web-app-capable` setzt Next aus
    // `appleWebApp` selbst; die alte iOS-Schreibweise nicht. Aktuelles iOS
    // liest den Anzeigemodus ohnehin aus dem Manifest – fuer aeltere Geraete
    // kostet diese Zeile nichts.
    'apple-mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  // Zwei Varianten, damit schon vor dem ersten Skriptlauf die passende gilt.
  // Sobald die App ihren eigenen Nachtmodus kennt, setzt sie beide um.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: LEISTE_TAG },
    { media: '(prefers-color-scheme: dark)', color: LEISTE_NACHT },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        {/*
         * Die beiden Schriften liegen selbst gehostet unter /public/fonts. Ohne
         * Vorladen findet der Browser sie erst, wenn er das CSS geparst hat –
         * ueber eine langsame Verbindung ist das eine zusaetzliche Runde, und
         * bis dahin steht der Text in der Systemschrift und springt danach um.
         */}
        <link
          rel="preload"
          href="/fonts/nunito-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/fraunces-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
