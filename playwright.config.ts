import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  retries: 1,

  // 1. Global Test Timeout: Maximum time one test can run (30 seconds)
  timeout: 30 * 1000,

  // 2. Expect Timeout: Maximum time for expect() assertions (30 seconds)
  expect: {
    timeout: 30 * 1000,
  },

  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // 3. Action Timeout: Maximum time for actions like click(), fill() (30 seconds)
    actionTimeout: 30 * 1000,

    // 4. Navigation Timeout: Maximum time for page.goto() (30 seconds)
    navigationTimeout: 30 * 1000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  // Dev server is assumed to already be running
});
