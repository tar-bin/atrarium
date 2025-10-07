import { expect, test } from '@playwright/test';

// TODO: Feeds are created within communities, not from a global /feeds page
// Update these tests to navigate to a community page first
test.describe.skip('Create Feed Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feeds');
  });

  test('should allow typing in the feed name field', async ({ page }) => {
    // Click "Create Feed" button
    await page.getByRole('button', { name: /create feed/i }).click();

    // Wait for modal to appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /create feed/i })).toBeVisible();

    // Find the name input field
    const nameInput = page.getByLabel(/^name$/i);
    await expect(nameInput).toBeVisible();

    // Type in the name field
    const testFeedName = 'Test Feed';
    await nameInput.fill(testFeedName);

    // Verify the input value
    await expect(nameInput).toHaveValue(testFeedName);
  });

  test('should allow typing in the description field', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create feed/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Find the description textarea
    const descriptionTextarea = page.getByLabel(/description/i);
    await expect(descriptionTextarea).toBeVisible();

    // Type in the description field
    const testDescription = 'This is a test feed for automated testing';
    await descriptionTextarea.fill(testDescription);

    // Verify the textarea value
    await expect(descriptionTextarea).toHaveValue(testDescription);
  });

  test('should validate required name field', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create feed/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Try to submit without filling name
    await page.getByRole('button', { name: /^create$/i }).click();

    // Should show validation error
    await expect(page.getByText(/name is required/i)).toBeVisible();

    // Modal should still be open
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should support keyboard input', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create feed/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const nameInput = page.getByLabel(/^name$/i);

    // Test keyboard typing
    await nameInput.focus();
    await page.keyboard.type('Keyboard Input Test');
    await expect(nameInput).toHaveValue('Keyboard Input Test');

    // Test editing
    await page.keyboard.press('Home');
    await page.keyboard.type('New ');
    await expect(nameInput).toHaveValue('New Keyboard Input Test');
  });
});
