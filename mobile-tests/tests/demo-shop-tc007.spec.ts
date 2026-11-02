import { test, expect } from '@mobilewright/test';

test.use({ bundleId: 'com.demoshop.mobile' });

test('DEMO-SHOP-TC007 - Sign in and view products', async ({ screen }) => {
  // Step 1: Verify sign in screen visible
  await expect(screen.getByText('Sign in').first()).toBeVisible();

  // Step 2: Enter the email
  await screen.getByLabel('Email').fill('demo@shop.test');
  await expect(screen.getByLabel('Email')).toHaveValue('demo@shop.test');

  // Step 3: Enter the password
  await screen.getByLabel('Password').fill('Demo@123');
  await expect(screen.getByLabel('Password')).toHaveValue('Demo@123');

  // Step 4: Tap Sign in and verify welcome
  await screen.getByRole('button', { name: 'Sign in' }).tap();
  await expect(screen.getByText('Welcome, Demo User')).toBeVisible();

  // Step 5: Add Notebook A5 to cart and verify
  await screen.getByRole('button', { name: 'Add Notebook A5 to cart' }).scrollIntoViewIfNeeded();
  await screen.getByRole('button', { name: 'Add Notebook A5 to cart' }).tap();
  await expect(screen.getByText('Notebook A5 added to cart')).toBeVisible();
  await expect(screen.getByRole('button', { name: 'Cart (1)' })).toBeVisible();

  // Step 6: Add Fountain Pen to cart and verify
  await screen.getByRole('button', { name: 'Add Fountain Pen to cart' }).scrollIntoViewIfNeeded();
  await screen.getByRole('button', { name: 'Add Fountain Pen to cart' }).tap();
  await expect(screen.getByRole('button', { name: 'Cart (2)' })).toBeVisible();
  await expect(screen.getByText('Fountain Pen added to cart')).toBeVisible();

  // Step 7: Open cart and assert both items present
  await screen.getByRole('button', { name: 'Cart (2)' }).tap();
  await expect(screen.getByText('Your cart')).toBeVisible();
  await expect(screen.getByText('Notebook A5')).toBeVisible();
  await expect(screen.getByText('Fountain Pen')).toBeVisible();

  // Step 8: Assert exact total
  await expect(screen.getByText('Total: ₹1,148')).toBeVisible();
});
