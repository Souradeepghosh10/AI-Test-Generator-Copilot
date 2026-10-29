import { test, expect } from '@mobilewright/test';

test('DEMO-SHOP-TC007 - Verify adding products to the cart', async ({ screen }) => {
  // Step 1: Launch the app (the config opens it fresh on the sign in screen)
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

  // Step 5: Tap "Add to cart" for "Notebook A5"
  await screen.getByRole('button', { name: 'Add Notebook A5 to cart' }).tap();
  await expect(screen.getByText('Notebook A5 added to cart')).toBeVisible();
  await expect(screen.getByRole('button', { name: 'Cart (1)' })).toBeVisible();

  // Step 6: Tap "Add to cart" for "Fountain Pen"
  await screen.getByRole('button', { name: 'Add Fountain Pen to cart' }).tap();
  await expect(screen.getByRole('button', { name: 'Cart (2)' })).toBeVisible();

  // Step 7: Tap the "Cart (2)" button
  await screen.getByRole('button', { name: 'Cart (2)' }).tap();
  await expect(screen.getByText('Your cart')).toBeVisible();
  await expect(screen.getByText('Notebook A5')).toBeVisible();
  await expect(screen.getByText('Fountain Pen')).toBeVisible();

  // Step 8: Verify the total
  await expect(screen.getByText('Total: ₹1,148')).toBeVisible();
});
