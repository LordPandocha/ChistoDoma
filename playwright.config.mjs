import { defineConfig, devices } from '@playwright/test';

const viewport = process.env.PW_VIEWPORT || 'desktop';
const engine = process.env.PW_ENGINE || 'chromium';

let use = {};
if (viewport === 'android') use = { ...devices['Pixel 7'] };
if (viewport === 'ios') use = { ...devices['iPhone 14'] };
if (viewport === 'desktop') use = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false };

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    ...use,
    browserName: engine,
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/static-server.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
