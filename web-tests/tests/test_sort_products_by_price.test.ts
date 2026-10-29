import { test, expect } from '@playwright/test';

// DEMO-SHOP-TC006: Verify sorting products by price
test('DEMO-SHOP-TC006 - Sort products by price', async ({ page }) => {
  // Step 1: Navigate to the login page
  await page.goto('http://localhost:4173/login.html');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  // Step 2: Enter the email
  await page.locator('//input[@type="email"]').fill('demo@shop.test');

  // Step 3: Enter the password
  await page.locator('//input[@type="password"]').fill('Demo@123');

  // Step 4: Click the 'Sign in' button
  await page.locator('button:has-text("Sign in")').click();
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  await expect(page.locator('text=Welcome, Demo User')).toBeVisible();

  // Step 5: Select "Price: low to high" in "Sort by"
  await page.locator('select').selectOption({ label: 'Price: low to high' });

  // Final: Assert the first product is "Leather Bookmark" and last is "Desk Lamp"
  const productNames = await page.locator('main li h2').allInnerTexts();
  expect(productNames[0]).toContain('Leather Bookmark');
  expect(productNames[productNames.length - 1]).toContain('Desk Lamp');
});
