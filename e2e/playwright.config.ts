import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests for the full BlendUs stack (Astro frontend + Laravel API).
 * Start the stack first: `docker compose up -d` from the repo root.
 */
export default defineConfig({
  testDir: './tests',
  // One worker: tests create posts and the "Latest" feed is ordered by date,
  // so running in parallel would make cards from other tests jump in between.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.FRONTEND_URL ?? 'http://localhost:4321',
    channel: 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Video needs Playwright's ffmpeg download; traces already include a step-by-step filmstrip.
    video: 'off',
  },
  projects: [
    { name: 'desktop-edge', use: { ...devices['Desktop Edge'], channel: 'msedge' }, grepInvert: /@mobile/ },
    { name: 'mobile-edge', use: { ...devices['Pixel 7'], channel: 'msedge' }, grep: /@mobile/ },
  ],
});
