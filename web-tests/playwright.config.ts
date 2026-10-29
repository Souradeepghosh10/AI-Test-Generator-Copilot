import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Serves the local Demo Shop (../demo-app/) for tests that use http://localhost:4173
  webServer: {
    command: 'python3 -m http.server 4173 --directory ../demo-app',
    url: 'http://localhost:4173/login.html',
    reuseExistingServer: true,
  },
});
