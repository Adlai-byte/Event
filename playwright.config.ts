import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60_000,

  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'tablet-chrome',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 768, height: 1024 },
      },
    },
  ],

  webServer: [
    {
      command: 'node server/index.js',
      port: 3001,
      env: {
        NODE_ENV: 'test',
        DB_NAME: 'event_test',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npx expo start --web --port 8081 --non-interactive',
      port: 8081,
      env: {
        EXPO_PUBLIC_API_BASE_URL: 'http://localhost:3001',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
