import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL first
    await page.goto('/');
    // Then clear localStorage
    await page.evaluate(() => localStorage.clear());
  });

  test('should show validation errors on login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form');

    // Try to submit empty form using the submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Check for validation messages
    await expect(page.getByText('Please enter a valid email')).toBeVisible();
    await expect(page.getByText('Please enter your password')).toBeVisible();
  });

  test('should show validation errors on signup form', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForSelector('form');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Check for validation messages
    await expect(page.getByText('Please enter a username')).toBeVisible();
    await expect(page.getByText('Please enter a valid email')).toBeVisible();
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });

  test('should navigate between login and signup pages', async ({ page }) => {
    // Start at login page
    await page.goto('/login');
    await page.waitForSelector('form');
    await expect(page).toHaveURL('/login');

    // Go to signup - using the link in the footer
    const signUpLink = page.getByRole('button', { name: 'Sign up' });
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await expect(page).toHaveURL('/signup');

    // Go back to login - using the link in the footer
    const signInLink = page.getByRole('button', { name: 'Sign in' });
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL('/login');
  });
});
