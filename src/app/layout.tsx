import type { Metadata, Viewport } from 'next'
import './globals.css'
import { DEFAULT_LOCALE } from '@/lib/i18n'

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
  themeColor: '#faf6f0',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
