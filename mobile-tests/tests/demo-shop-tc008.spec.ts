import { test, expect } from '@mobilewright/test';

test('DEMO-SHOP-TC008 - Remove a product from the cart', async ({ screen }) => {
  // Step 1: Launch the app
  await expect(screen.getByText('Sign in').first()).toBeVisible();

  // Step 2: Enter the email
  await screen.getByLabel('Email').fill('demo@shop.test');
  await expect(screen.getByLabel('Email')).toHaveValue('demo@shop.test');

  // Step 3: Enter the password
  await screen.getByLabel('Password').fill('Demo@123');
  await expect(screen.getByLabel('Password')).toHaveValue('Demo@123');

  // Step 4: Tap the "Sign in" button
  await screen.getByRole('button', { name: 'Sign in' }).tap();
  await expect(screen.getByText('Welcome, Demo User')).toBeVisible();

  // Step 5: Add "Pencil Set" to cart
  await screen.getByRole('button', { name: 'Add Pencil Set to cart' }).scrollIntoViewIfNeeded();
  await screen.getByRole('button', { name: 'Add Pencil Set to cart' }).tap();
  await expect(screen.getByText('Pencil Set added to cart')).toBeVisible();
  await expect(screen.getByRole('button', { name: 'Cart (1)' })).toBeVisible();

  // Step 6: Open cart
  await screen.getByRole('button', { name: 'Cart (1)' }).tap();
  await expect(screen.getByText('Pencil Set')).toBeVisible();

  // Step 7: Remove "Pencil Set"
  await screen.getByRole('button', { name: 'Remove Pencil Set' }).tap();
  await expect(screen.getByText('Your cart is empty.')).toBeVisible();
  await expect(screen.getByRole('button', { name: 'Cart (0)' })).toBeVisible();
});
