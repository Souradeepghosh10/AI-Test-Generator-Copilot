import { test, expect } from '@mobilewright/test';

test('DEMO-SHOP-TC011 - Verify signing out from the account menu', async ({ screen }) => {
  // Step 1: The app opens on the sign in screen
  await expect(screen.getByText('Sign in').first()).toBeVisible();

  // Step 2: Enter the email
  await screen.getByLabel('Email').fill('demo@shop.test');

  // Step 3: Enter the password
  await screen.getByLabel('Password').fill('Demo@123');

  // Step 4: Tap the "Sign in" button
  await screen.getByRole('button', { name: 'Sign in' }).tap();
  await expect(screen.getByText('Welcome, Demo User')).toBeVisible();

  // Step 5: Tap the "Account" button
  await screen.getByRole('button', { name: 'Account' }).tap();
  await expect(screen.getByText('Sign out')).toBeVisible();

  // Step 6: Tap "Sign out"
  await screen.getByText('Sign out').tap();
  await expect(screen.getByText('You have signed out')).toBeVisible();
});
