import { test, expect } from '@playwright/test';

test.describe('PDS Login Form', () => {
  test.beforeEach(async ({ page }) => {
    // PDS login form is on the home page
    await page.goto('/');
  });

  test('should allow typing in handle field', async ({ page }) => {
    // Find the handle input field
    const handleInput = page.getByLabel(/handle/i);
    await expect(handleInput).toBeVisible();

    // Type in the handle field
    const testHandle = 'alice.test';
    await handleInput.fill(testHandle);

    // Verify the input value
    await expect(handleInput).toHaveValue(testHandle);
  });

  test('should allow typing in password field', async ({ page }) => {
    // Find the password input field
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();

    // Type in the password field
    const testPassword = 'test123';
    await passwordInput.fill(testPassword);

    // Verify the input value
    await expect(passwordInput).toHaveValue(testPassword);
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling fields
    await page.getByRole('button', { name: /login/i }).click();

    // Should show validation errors
    await expect(page.getByText(/handle is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should support keyboard input in both fields', async ({ page }) => {
    const handleInput = page.getByLabel(/handle/i);
    const passwordInput = page.getByLabel(/password/i);

    // Test keyboard typing in handle field
    await handleInput.focus();
    await page.keyboard.type('bob.test');
    await expect(handleInput).toHaveValue('bob.test');

    // Test keyboard typing in password field
    await passwordInput.focus();
    await page.keyboard.type('securepassword');
    await expect(passwordInput).toHaveValue('securepassword');

    // Test tab navigation
    await handleInput.focus();
    await page.keyboard.press('Tab');
    await expect(passwordInput).toBeFocused();
  });

  test('password field should mask input', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);

    // Verify password field has type="password"
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Type in password field
    await passwordInput.fill('mysecret123');

    // Value should still be retrievable programmatically
    await expect(passwordInput).toHaveValue('mysecret123');
  });
});
