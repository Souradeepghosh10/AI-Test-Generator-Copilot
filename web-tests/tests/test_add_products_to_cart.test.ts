import { test, expect } from '@playwright/test';

// DEMO-SHOP-TC007: Verify adding products to the cart
test('DEMO-SHOP-TC007 - Add products to the cart', async ({ page }) => {
  // Step 1: Navigate to the login page
  await page.goto('http://localhost:4173/login.html');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  // Step 2: Enter the email
  await page.locator('//input[@type="email"]').fill('demo@shop.test');

  // Step 3: Enter the password
  await page.locator('//input[@type="password"]').fill('Demo@123');

  // Step 4: Click the "Sign in" button
  await page.locator('button:has-text("Sign in")').click();
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  await expect(page.locator('text=Welcome, Demo User')).toBeVisible();

  // Step 5: Click "Add to cart" for "Notebook A5"
  await page.locator('[aria-label="Add Notebook A5 to cart"]').click();
  await expect(page.locator('text=Notebook A5 added to cart')).toBeVisible();
  await expect(page.locator('a:has-text("Cart (1)")')).toBeVisible();

  // Step 6: Click "Add to cart" for "Fountain Pen"
  await page.locator('[aria-label="Add Fountain Pen to cart"]').click();
  await expect(page.locator('a:has-text("Cart (2)")')).toBeVisible();

  // Step 7: Click the "Cart (2)" link
  await page.locator('a:has-text("Cart (2)")').click();
  await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();

  // Step 8: Verify the cart lists Notebook A5 and Fountain Pen
  await expect(page.locator('table:has-text("Notebook A5")')).toBeVisible();
  await expect(page.locator('table:has-text("Fountain Pen")')).toBeVisible();

  // Step 9: Verify the total
  await expect(page.locator('main')).toContainText('Total: ₹1,148');
});
