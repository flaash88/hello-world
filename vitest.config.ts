import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/**/*.test.ts',
        // Reine Datendateien ohne Logik.
        'src/lib/growth/data/**',
        'src/lib/events/types.ts',
        'src/lib/pregnancy/hospital-bag.ts',
        'src/lib/stats/periods.ts',
        // Alles, was zwingend eine Datenbank oder einen Browser braucht:
        // abgedeckt durch die Playwright-Tests, nicht durch Unit-Tests.
        // Ein Prisma-Mock wuerde hier nur den Mock testen.
        'src/lib/db.ts',
        'src/lib/realtime.ts',
        'src/lib/household.ts',
        'src/lib/actions/**',
        'src/lib/auth/session.ts',
        'src/lib/auth/csrf.ts',
        'src/lib/auth/rate-limit.ts',
        'src/lib/events/service.ts',
        'src/lib/events/queries.ts',
        'src/lib/sleep/analysis.ts',
        'src/lib/stats/queries.ts',
        'src/lib/push/**',
        'src/lib/export/backup.ts',
        'src/lib/export/weekly-report.ts',
        'src/lib/pregnancy/seed.ts',
        'src/lib/media/storage.ts',
        'src/lib/backup/files.ts',
        'src/lib/sounds/player.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
})
