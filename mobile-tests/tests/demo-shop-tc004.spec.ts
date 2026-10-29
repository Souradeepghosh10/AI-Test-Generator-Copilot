import { test, expect } from '@mobilewright/test';

test('DEMO-SHOP-TC004 - Verify creating a new account', async ({ screen }) => {
  // Step 1: Launch the app (the config opens it fresh on the sign in screen)
  await expect(screen.getByText('Sign in').first()).toBeVisible();

  // Step 2: Tap the "New user? Sign up" button
  await screen.getByRole('button', { name: 'New user? Sign up' }).tap();
  await expect(screen.getByText('Create account').first()).toBeVisible();

  // Step 3: Enter the full name
  await screen.getByLabel('Full name').fill('Test User');
  await expect(screen.getByLabel('Full name')).toHaveValue('Test User');

  // Step 4: Enter the email
  await screen.getByLabel('Email').fill('test.user@example.com');
  await expect(screen.getByLabel('Email')).toHaveValue('test.user@example.com');

  // Step 5: Enter the password
  await screen.getByLabel('Password').fill('Secret@123');
  await expect(screen.getByLabel('Password')).toHaveValue('Secret@123');

  // Step 6: Tick the interest "Playwright"
  await screen.getByRole('checkbox', { name: 'Playwright' }).tap();
  await expect(screen.getByRole('checkbox', { name: 'Playwright' })).toBeChecked();

  // Step 7: Select the state "Karnataka"
  await screen.getByLabel('State').scrollIntoViewIfNeeded();
  await screen.getByLabel('State').tap();
  await screen.getByText('Karnataka').tap();
  await expect(screen.getByText('Karnataka')).toBeVisible();

  // Step 8: Tap the "Create account" button
  await screen.getByRole('button', { name: 'Create account' }).scrollIntoViewIfNeeded();
  await screen.getByRole('button', { name: 'Create account' }).tap();
  await screen.getByText('Account created for Test User. You can now sign in.').scrollIntoViewIfNeeded();
  await expect(screen.getByText('Account created for Test User. You can now sign in.')).toBeVisible();
});
