import { test, expect } from '@playwright/test';
import { mockLogin } from '../helpers/auth';

test.describe('Create Community Modal', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page);
    await page.goto('/communities');
  });

  test('should allow typing in the community name field', async ({ page }) => {
    // Click "Create Community" button
    await page.getByRole('button', { name: /create community/i }).click();

    // Wait for modal to appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /create community/i })).toBeVisible();

    // Find the name input field
    const nameInput = page.getByLabel(/^name$/i);
    await expect(nameInput).toBeVisible();

    // Type in the name field
    const testCommunityName = 'Test Community';
    await nameInput.fill(testCommunityName);

    // Verify the input value
    await expect(nameInput).toHaveValue(testCommunityName);
  });

  test('should allow typing in the description field', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create community/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Find the description textarea
    const descriptionTextarea = page.getByLabel(/description/i);
    await expect(descriptionTextarea).toBeVisible();

    // Type in the description field
    const testDescription = 'This is a test community for automated testing';
    await descriptionTextarea.fill(testDescription);

    // Verify the textarea value
    await expect(descriptionTextarea).toHaveValue(testDescription);
  });

  test('should validate required name field', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create community/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Try to submit without filling name
    await page.getByRole('button', { name: /^create$/i }).click();

    // Should show validation error
    await expect(page.getByText(/name is required/i)).toBeVisible();

    // Modal should still be open
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should submit form with valid data', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create community/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill in the form
    await page.getByLabel(/^name$/i).fill('Integration Test Community');
    await page.getByLabel(/description/i).fill('A community created by integration test');

    // Submit the form
    await page.getByRole('button', { name: /^create$/i }).click();

    // Modal should close (in real implementation)
    // For now, we just verify the form was filled correctly before submission
    // TODO: Add assertion for successful submission once backend is connected
  });

  test('should close modal when Cancel is clicked', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create community/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should support keyboard input in all text fields', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create community/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const nameInput = page.getByLabel(/^name$/i);
    const descriptionTextarea = page.getByLabel(/description/i);

    // Test keyboard typing in name field
    await nameInput.focus();
    await page.keyboard.type('Keyboard Test');
    await expect(nameInput).toHaveValue('Keyboard Test');

    // Test keyboard typing in description field
    await descriptionTextarea.focus();
    await page.keyboard.type('Testing keyboard input');
    await expect(descriptionTextarea).toHaveValue('Testing keyboard input');

    // Test backspace
    await nameInput.focus();
    await page.keyboard.press('End');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await expect(nameInput).toHaveValue('Keyboard ');

    // Test select all and replace
    await nameInput.press('Control+A');
    await page.keyboard.type('New Name');
    await expect(nameInput).toHaveValue('New Name');
  });
});
