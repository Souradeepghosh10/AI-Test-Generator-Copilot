import { defineConfig } from 'mobilewright';

// Mobilewright tests for the native Demo Shop app (demo-mobile-app/), on a running Android emulator or device
export default defineConfig({
  platform: 'android',
  bundleId: 'com.demoshop.mobile',
  // Built by ../demo-mobile-app/build.sh; installed before the tests run
  installApps: '../demo-mobile-app/build/demo-shop.apk',
  // The app is closed and opened again before each test, so each test starts signed out with an empty cart
  autoAppLaunch: true,
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  viewTree: 'on-failure',
});
