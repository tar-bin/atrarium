import { test, expect } from '@playwright/test';
import { mockLogin } from '../helpers/auth';

/**
 * E2E tests for community settings
 * Tests feed mix configuration, member management, and community settings
 */
test.describe('Community Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login to access protected routes
    await mockLogin(page);

    // Navigate to a community page (settings are shown inline for owners)
    await page.goto('/communities/test-community-id');
  });

  test('should display community settings page', async ({ page }) => {
    // Verify page title (look for it within the main content area)
    await expect(page.getByRole('main').getByText('Community Settings')).toBeVisible();

    // Verify settings description
    await expect(page.getByText(/update community information/i)).toBeVisible();
  });

  test('should show current community name', async ({ page }) => {
    // Verify community name field exists and has a value
    const nameInput = page.getByLabel('Name');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).not.toHaveValue('');
  });

  test('should allow editing community name', async ({ page }) => {
    const nameInput = page.getByLabel('Name');

    // Clear and type new name
    await nameInput.clear();
    const newName = 'Updated Community Name';
    await nameInput.fill(newName);

    // Verify new value
    await expect(nameInput).toHaveValue(newName);
  });

  test('should allow editing community description', async ({ page }) => {
    const descriptionTextarea = page.getByLabel(/description/i);

    // Type new description
    const newDescription = 'Updated community description for testing';
    await descriptionTextarea.clear();
    await descriptionTextarea.fill(newDescription);

    // Verify new value
    await expect(descriptionTextarea).toHaveValue(newDescription);
  });

  test('should validate community name is not empty', async ({ page }) => {
    const nameInput = page.getByLabel('Name');
    const saveButton = page.getByRole('button', { name: /save/i });

    // Clear name field
    await nameInput.clear();

    // Try to save
    await saveButton.click();

    // Should show validation error
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });
});

/**
 * Tests for feed mix configuration
 * TODO: Implement after Feed Mix UI is created
 */
test.describe.skip('Feed Mix Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/communities/test-community-id');
  });

  test('should display feed mix sliders', async ({ page }) => {
    // Verify feed mix section exists
    await expect(page.getByText(/feed mix/i)).toBeVisible();

    // Verify three sliders for own/parent/global
    await expect(page.getByLabel(/own feed/i)).toBeVisible();
    await expect(page.getByLabel(/parent feed/i)).toBeVisible();
    await expect(page.getByLabel(/global feed/i)).toBeVisible();
  });

  test('should show current feed mix values', async ({ page }) => {
    // Check that sliders have values
    const ownFeedSlider = page.getByLabel(/own feed/i);
    await expect(ownFeedSlider).toBeVisible();

    // Verify value is a valid percentage (0-100)
    const value = await ownFeedSlider.inputValue();
    const numValue = parseInt(value);
    expect(numValue).toBeGreaterThanOrEqual(0);
    expect(numValue).toBeLessThanOrEqual(100);
  });

  test('should allow adjusting feed mix with sliders', async ({ page }) => {
    const ownFeedSlider = page.getByLabel(/own feed/i);

    // Set slider value
    await ownFeedSlider.fill('60');

    // Verify value
    await expect(ownFeedSlider).toHaveValue('60');
  });

  test('should ensure feed mix percentages sum to 100', async ({ page }) => {
    // Get all three sliders
    const ownFeedSlider = page.getByLabel(/own feed/i);
    const parentFeedSlider = page.getByLabel(/parent feed/i);
    const globalFeedSlider = page.getByLabel(/global feed/i);

    // Set values
    await ownFeedSlider.fill('50');
    await parentFeedSlider.fill('30');
    await globalFeedSlider.fill('20');

    // Try to save
    await page.getByRole('button', { name: /save/i }).click();

    // Should accept (sum is 100) or show error if validation fails
    // Implementation may auto-adjust sliders to sum to 100
  });

  test('should show validation error if feed mix does not sum to 100', async ({ page }) => {
    const ownFeedSlider = page.getByLabel(/own feed/i);
    const parentFeedSlider = page.getByLabel(/parent feed/i);
    const globalFeedSlider = page.getByLabel(/global feed/i);

    // Set values that don't sum to 100
    await ownFeedSlider.fill('50');
    await parentFeedSlider.fill('50');
    await globalFeedSlider.fill('50');

    // Try to save
    await page.getByRole('button', { name: /save/i }).click();

    // Should show validation error
    // Note: Implementation may prevent this by auto-adjusting
    // await expect(page.getByText(/must sum to 100/i)).toBeVisible();
  });

  test('should support keyboard input for slider values', async ({ page }) => {
    const ownFeedSlider = page.getByLabel(/own feed/i);

    // Focus and use keyboard
    await ownFeedSlider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    // Value should have increased
    // Note: Exact behavior depends on slider implementation
  });

  test('should show visual feedback for feed mix distribution', async ({ page }) => {
    // Check if there's a visual representation (e.g., pie chart, bar chart)
    const visualization = page.locator('[data-testid="feed-mix-visualization"]');
    // Note: Implementation-specific
  });
});

/**
 * Tests for member management
 * TODO: Implement after Member Management UI is created
 */
test.describe.skip('Member Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/communities/test-community-id');
  });

  test('should display member list', async ({ page }) => {
    // Verify page title
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible();

    // Verify table exists
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should show member information columns', async ({ page }) => {
    // Wait for table to load
    await expect(page.getByRole('table')).toBeVisible();

    // Verify column headers
    await expect(page.getByRole('columnheader', { name: /user/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /role/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /joined/i })).toBeVisible();
  });

  test('should display role badges for members', async ({ page }) => {
    // Wait for members to load
    await page.waitForSelector('[data-testid="member-item"]', { timeout: 5000 }).catch(() => {});

    const firstMember = page.locator('[data-testid="member-item"]').first();

    if (await firstMember.isVisible()) {
      // Check for role badge (owner/moderator/member)
      const roleBadge = firstMember.locator('[data-testid="role-badge"]');
      // await expect(roleBadge).toBeVisible();
    }
  });

  test('should allow searching for members', async ({ page }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/search members/i);

    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('alice');

      // Wait for filtered results
      await page.waitForTimeout(500); // Debounce

      // Verify filtering (implementation-specific)
    }
  });

  test('should show member actions menu', async ({ page }) => {
    const firstMember = page.locator('[data-testid="member-item"]').first();

    if (!(await firstMember.isVisible())) {
      test.skip();
    }

    // Open actions menu
    await firstMember.getByRole('button', { name: /actions/i }).click();

    // Verify menu options
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('should allow changing member role', async ({ page }) => {
    const firstMember = page.locator('[data-testid="member-item"]').first();

    if (!(await firstMember.isVisible())) {
      test.skip();
    }

    // Open actions menu
    await firstMember.getByRole('button', { name: /actions/i }).click();

    // Click "Change Role"
    const changeRoleOption = page.getByRole('menuitem', { name: /change role/i });
    if (await changeRoleOption.isVisible()) {
      await changeRoleOption.click();

      // Verify role selection dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/select role/i)).toBeVisible();
    }
  });

  test('should show confirmation before removing member', async ({ page }) => {
    const firstMember = page.locator('[data-testid="member-item"]').first();

    if (!(await firstMember.isVisible())) {
      test.skip();
    }

    // Open actions menu
    await firstMember.getByRole('button', { name: /actions/i }).click();

    // Click "Remove Member"
    const removeOption = page.getByRole('menuitem', { name: /remove member/i });
    if (await removeOption.isVisible()) {
      await removeOption.click();

      // Verify confirmation dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/are you sure.*remove/i)).toBeVisible();
    }
  });

  test('should filter members by role', async ({ page }) => {
    // Find role filter
    const roleFilter = page.getByLabel(/filter by role/i);

    if (await roleFilter.isVisible()) {
      await roleFilter.click();

      // Select "Moderator" role
      await page.getByRole('option', { name: /moderator/i }).click();

      // Verify filtering (implementation-specific)
    }
  });

  test('should show member count', async ({ page }) => {
    // Check for member count display
    const memberCount = page.getByText(/\d+ members/i);
    // await expect(memberCount).toBeVisible();
  });
});

/**
 * Tests for community deletion
 * TODO: Implement after full deletion flow is created
 */
test.describe.skip('Community Deletion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/communities/test-community-id');
  });

  test('should show danger zone section', async ({ page }) => {
    // Scroll to bottom to find danger zone
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify danger zone section
    const dangerZone = page.getByText(/danger zone/i);
    // await expect(dangerZone).toBeVisible();
  });

  test('should show delete community button', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const deleteButton = page.getByRole('button', { name: /delete community/i });
    // await expect(deleteButton).toBeVisible();
  });

  test('should require confirmation before deleting community', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const deleteButton = page.getByRole('button', { name: /delete community/i });

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verify confirmation dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/are you sure.*delete/i)).toBeVisible();
    }
  });

  test('should require typing community name to confirm deletion', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const deleteButton = page.getByRole('button', { name: /delete community/i });

    if (!(await deleteButton.isVisible())) {
      test.skip();
    }

    await deleteButton.click();

    // Find confirmation input
    const confirmInput = page.getByPlaceholder(/type.*name.*confirm/i);
    if (await confirmInput.isVisible()) {
      // Type incorrect name
      await confirmInput.fill('wrong name');

      // Confirm button should be disabled
      const confirmButton = page.getByRole('button', { name: /^delete$/i });
      await expect(confirmButton).toBeDisabled();

      // Type correct name
      await confirmInput.clear();
      await confirmInput.fill('correct-community-name');

      // Confirm button should be enabled
      await expect(confirmButton).toBeEnabled();
    }
  });
});

/**
 * Tests for settings permissions
 */
test.describe('Settings Permissions', () => {
  test.skip('should only allow owners to access settings', async ({ page }) => {
    // TODO: Implement after role-based access control is integrated
    // This test should verify that:
    // 1. Regular members cannot access settings
    // 2. Moderators have limited access
    // 3. Owners have full access
  });

  test.skip('should hide delete button for non-owners', async ({ page }) => {
    // TODO: Implement after role-based access control is integrated
  });
});

/**
 * Tests for settings with backend integration
 */
test.describe('Settings with Backend Integration', () => {
  test.skip('should save community settings changes', async ({ page }) => {
    // TODO: Implement after backend API integration
  });

  test.skip('should show success message after saving', async ({ page }) => {
    // TODO: Implement after backend API integration
  });

  test.skip('should show error message on save failure', async ({ page }) => {
    // TODO: Implement after backend API integration
  });

  test.skip('should persist feed mix changes', async ({ page }) => {
    // TODO: Implement after backend API integration
  });
});
