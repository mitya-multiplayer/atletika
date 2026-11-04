import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
// GitHub Pages serves the app from /<repo>/, not the site root. Tests use the
// same layout, so they navigate with relative URLs: page.goto('./#/days').
const PAGES_BASE = '/ATLETIKA/';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}${PAGES_BASE}`,
    trace: 'retain-on-failure',
  },
  // WebKit approximates iPhone Safari; Chromium approximates Android Chrome.
  // Neither replaces a check on a real phone (see docs/DEVICE_CHECKLIST.md).
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --base ${PAGES_BASE}`,
    url: `http://localhost:${PORT}${PAGES_BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
