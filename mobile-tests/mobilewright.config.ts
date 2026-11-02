import { defineConfig } from 'mobilewright';
// The app under test (platform, app id, app file) comes from ../qa.config.json
import qa from '../scripts/qa-config.cjs';

// Mobilewright tests on a running Android emulator / device or iOS simulator
export default defineConfig({
  platform: qa.mobile.platform,
  bundleId: qa.mobile.appId || undefined,
  // Installed before the tests run (none: the app must already be on the device)
  installApps: qa.mobile.appFile || undefined,
  // The app is closed and opened again before each test, so each test starts fresh on its first screen
  autoAppLaunch: true,
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  viewTree: 'on-failure',
});
