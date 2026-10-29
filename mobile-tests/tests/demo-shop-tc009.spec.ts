import { test, expect } from '@mobilewright/test';

test('DEMO-SHOP-TC009 - Verify placing an order', async ({ screen }) => {
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

  // Step 5: Tap "Add to cart" for "Desk Lamp"
  await screen.getByRole('button', { name: 'Add Desk Lamp to cart' }).tap();
  await expect(screen.getByRole('button', { name: 'Cart (1)' })).toBeVisible();

  // Step 6: Tap the "Cart (1)" button
  await screen.getByRole('button', { name: 'Cart (1)' }).tap();
  await expect(screen.getByText('Total: ₹1,499')).toBeVisible();

  // Step 7: Tap "Proceed to checkout"
  await screen.getByRole('button', { name: 'Proceed to checkout' }).tap();
  await expect(screen.getByText('Order total: ₹1,499')).toBeVisible();

  // Step 8: Enter the full name
  await screen.getByLabel('Full name').fill('Demo User');
  await expect(screen.getByLabel('Full name')).toHaveValue('Demo User');

  // Step 9: Enter the address
  await screen.getByLabel('Address').fill('12 MG Road');
  await expect(screen.getByLabel('Address')).toHaveValue('12 MG Road');

  // Step 10: Enter the city
  await screen.getByLabel('City').fill('Bengaluru');
  await expect(screen.getByLabel('City')).toHaveValue('Bengaluru');

  // Step 11: Enter the PIN code
  await screen.getByLabel('PIN code').scrollIntoViewIfNeeded();
  await screen.getByLabel('PIN code').fill('560001');
  await expect(screen.getByLabel('PIN code')).toHaveValue('560001');

  // Step 12: Select the payment method "Cash on delivery"
  await screen.getByRole('radio', { name: 'Cash on delivery' }).scrollIntoViewIfNeeded();
  await screen.getByRole('radio', { name: 'Cash on delivery' }).tap();
  await expect(screen.getByRole('radio', { name: 'Cash on delivery' })).toBeChecked();

  // Step 13: Tap the "Place order" button
  await screen.getByRole('button', { name: 'Place order' }).scrollIntoViewIfNeeded();
  await screen.getByRole('button', { name: 'Place order' }).tap();
  await expect(screen.getByText('Order placed')).toBeVisible();
  await expect(screen.getByText('Thank you, Demo User. Your order number is DS-1001.')).toBeVisible();
});
