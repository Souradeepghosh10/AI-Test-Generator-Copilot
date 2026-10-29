import { test, expect } from '@playwright/test';

// DEMO-SHOP-TC011: Verify signing out from the account menu
test('DEMO-SHOP-TC011 - Sign out from account menu', async ({ page }) => {
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

  // Step 5: Click the "Account" button
  await page.locator('button:has-text("Account")').click();

  // Step 6: Click "Sign out"
  await page.locator('text=Sign out').click();

  // Final: Assert login page opens and shows "You have signed out"
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator('main')).toContainText('You have signed out');
});
