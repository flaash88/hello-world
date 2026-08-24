import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
})

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js injects inline bootstrap scripts; no external script origins are allowed.
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone nur fuer das Docker-Image – lokal und im E2E-Lauf stoert es
  // `next start`.
  output: process.env.BUILD_STANDALONE === '1' ? ('standalone' as const) : undefined,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    /*
     * Wie lange eine schon besuchte Seite im Router-Cache des Browsers gilt.
     *
     * Ohne das holt jeder Tab-Wechsel die Seite neu vom Server – ueber den
     * Tunnel sind das jedes Mal ein paar hundert Millisekunden, und zwischen
     * "Heute" und "Verlauf" hin und her zu tippen fuehlt sich zaeh an. Mit 30
     * Sekunden ist der Weg zurueck sofort da.
     *
     * Veraltete Daten sind dabei kein Thema: traegt die andere Person etwas
     * ein, kommt das ueber SSE herein und loest `router.refresh()` aus – und
     * das verwirft den Cache.
     */
    staleTimes: { dynamic: 30, static: 180 },
  },
  serverExternalPackages: ['@node-rs/argon2', 'pg', 'sharp'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default withSerwist(nextConfig)
