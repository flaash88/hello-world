import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: process.env.E2E_DIR ?? './e2e',
  globalSetup: './e2e/reset-db.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    locale: 'de-AT',
    timezoneId: 'Europe/Vienna',
  },
  projects: [
    // Bedienung ist zu 95 % am Handy – deshalb ist das Handy der Standardfall.
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        // In Umgebungen mit vorinstalliertem Chromium (CI-Container) den
        // vorhandenen Browser nutzen statt einen zweiten herunterzuladen.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Der Testserver laeuft ueber http – ohne das Secure-Flag kommen die
    // Session-Cookies auch bei API-Anfragen an.
    env: { NODE_ENV: 'production', COOKIE_SECURE: 'false' },
  },
})
