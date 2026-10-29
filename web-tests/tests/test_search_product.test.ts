import { test, expect } from '@playwright/test';

// DEMO-SHOP-TC005: Verify searching for a product
test('DEMO-SHOP-TC005 - Search for a product', async ({ page }) => {
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

  // Step 5: Type in the "Search products" box
  await page.locator('input[type="search"]').fill('lamp');

  // Final: Only "Desk Lamp" is listed and "1 product found" is shown
  await expect(page.locator('main')).toContainText('Desk Lamp');
  await expect(page.locator('main')).toContainText('1 product found');
});
