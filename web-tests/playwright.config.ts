import { defineConfig, devices } from '@playwright/test';
// The app under test (URL, how to start it, test id attribute) comes from ../qa.config.json
import qa from '../scripts/qa-config.cjs';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    testIdAttribute: qa.web.testIdAttribute,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Starts the app first when qa.config.json says how (a local app); an online app needs nothing
  webServer: qa.web.startCommand && qa.web.url ? {
    command: qa.web.startCommand,
    url: qa.web.url,
    cwd: qa.root,
    reuseExistingServer: true,
  } : undefined,
});
