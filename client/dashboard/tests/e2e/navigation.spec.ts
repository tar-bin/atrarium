import { test, expect } from '@playwright/test';

/**
 * E2E tests for application navigation
 * Tests sidebar navigation, page transitions, and routing
 */
test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display main navigation links', async ({ page }) => {
    // Verify main navigation links (sidebar navigation is visible)
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Communities' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Moderation Log' })).toBeVisible();
  });

  test('should navigate to home page', async ({ page }) => {
    // Click home link
    await page.getByRole('link', { name: 'Home' }).click();

    // Verify URL
    await expect(page).toHaveURL('/');

    // Verify home page content
    await expect(page.getByRole('main').getByText(/welcome/i)).toBeVisible();
  });

  test('should navigate to communities page', async ({ page }) => {
    // Click communities link
    await page.getByRole('link', { name: 'Communities' }).click();

    // Verify URL
    await expect(page).toHaveURL('/communities');

    // Verify communities page content
    await expect(page.getByRole('heading', { name: /communities/i })).toBeVisible();
  });

  test('should navigate to moderation log page', async ({ page }) => {
    // Click moderation link
    await page.getByRole('link', { name: 'Moderation Log' }).click();

    // Verify URL
    await expect(page).toHaveURL('/moderation');

    // Verify moderation page content
    await expect(page.getByRole('main').getByText('Moderation Log')).toBeVisible();
  });

  test.skip('should highlight active navigation item', async ({ page }) => {
    // TODO: Implement after active state styling is confirmed
    // Navigate to communities
    await page.getByRole('link', { name: 'Communities' }).click();

    // Verify communities link is highlighted (implementation-specific)
    const communitiesLink = page.getByRole('link', { name: 'Communities' });
    // Note: Actual assertion depends on how active state is implemented
    // await expect(communitiesLink).toHaveClass(/active/i);
  });

  test.skip('should support keyboard navigation in sidebar', async ({ page }) => {
    // TODO: Test keyboard navigation separately
    // Focus on first navigation link
    await page.getByRole('link', { name: 'Home' }).focus();

    // Use Tab to navigate through links
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Communities' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Moderation Log' })).toBeFocused();
  });
});

/**
 * Tests for header navigation and user menu
 */
test.describe.skip('Header Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display application header', async ({ page }) => {
    // Verify header exists
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Verify logo/title
    await expect(page.getByText(/atrarium/i)).toBeVisible();
  });

  test('should show PDS connection status', async ({ page }) => {
    // Check for PDS status indicator
    const pdsStatus = page.getByTestId('pds-status');
    // Note: This may show "Not connected" or "Connected" depending on state
  });

  test('should display user menu when logged in', async ({ page }) => {
    // Skip if not logged in
    const userMenu = page.getByRole('button', { name: /user menu/i });
    if (await userMenu.isVisible()) {
      // Click user menu
      await userMenu.click();

      // Verify menu options
      await expect(page.getByRole('menuitem', { name: /profile/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /logout/i })).toBeVisible();
    }
  });

  test('should show language switcher', async ({ page }) => {
    // Check for language selector
    const langSwitcher = page.getByRole('button', { name: /language/i });
    if (await langSwitcher.isVisible()) {
      await langSwitcher.click();

      // Verify language options
      await expect(page.getByRole('option', { name: /english/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /日本語/i })).toBeVisible();
    }
  });
});

/**
 * Tests for page transitions and routing
 */
test.describe.skip('Page Transitions', () => {
  test('should navigate between pages without full reload', async ({ page }) => {
    await page.goto('/');

    // Navigate to communities
    await page.getByRole('link', { name: /communities/i }).click();
    await expect(page).toHaveURL('/communities');

    // Navigate back to home
    await page.getByRole('link', { name: /home/i }).click();
    await expect(page).toHaveURL('/');

    // Note: In SPA, page shouldn't reload between navigations
    // This can be verified by checking if certain state persists
  });

  test('should support browser back/forward navigation', async ({ page }) => {
    await page.goto('/');

    // Navigate to communities
    await page.getByRole('link', { name: /communities/i }).click();
    await expect(page).toHaveURL('/communities');

    // Navigate to moderation
    await page.getByRole('link', { name: /moderation/i }).click();
    await expect(page).toHaveURL('/moderation');

    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL('/communities');

    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL('/moderation');
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Navigate directly to communities page
    await page.goto('/communities');
    await expect(page.getByRole('heading', { name: /communities/i })).toBeVisible();

    // Navigate directly to moderation page
    await page.goto('/moderation');
    await expect(page.getByRole('heading', { name: /moderation log/i })).toBeVisible();
  });

  test('should show 404 page for invalid routes', async ({ page }) => {
    // Navigate to non-existent route
    await page.goto('/this-route-does-not-exist');

    // Verify 404 message (implementation-specific)
    // await expect(page.getByText(/not found/i)).toBeVisible();
  });
});

/**
 * Tests for nested navigation (community → feed detail)
 */
test.describe.skip('Nested Navigation', () => {
  test('should navigate from community list to community detail', async ({ page }) => {
    await page.goto('/communities');

    // Click on first community (if exists)
    const firstCommunity = page.locator('[data-testid="community-item"]').first();
    if (await firstCommunity.isVisible()) {
      await firstCommunity.click();

      // Verify navigation to community detail page
      await expect(page.url()).toMatch(/\/communities\/[^/]+$/);

      // Verify community detail content
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('should navigate from community to feed detail', async ({ page }) => {
    // Navigate to a community
    await page.goto('/communities/test-community-id');

    // Click on first feed (if exists)
    const firstFeed = page.locator('[data-testid="feed-item"]').first();
    if (await firstFeed.isVisible()) {
      await firstFeed.click();

      // Verify navigation to feed detail page
      await expect(page.url()).toMatch(/\/communities\/[^/]+\/feeds\/[^/]+$/);
    }
  });

  test('should show breadcrumb navigation on nested pages', async ({ page }) => {
    await page.goto('/communities/test-community-id/feeds/test-feed-id');

    // Check for breadcrumb navigation
    const breadcrumb = page.getByRole('navigation', { name: /breadcrumb/i });
    if (await breadcrumb.isVisible()) {
      // Verify breadcrumb items
      await expect(breadcrumb.getByText(/communities/i)).toBeVisible();
      // Community name and feed name should also appear
    }
  });

  test('should support breadcrumb click navigation', async ({ page }) => {
    await page.goto('/communities/test-community-id/feeds/test-feed-id');

    const breadcrumb = page.getByRole('navigation', { name: /breadcrumb/i });
    if (await breadcrumb.isVisible()) {
      // Click on communities breadcrumb
      await breadcrumb.getByRole('link', { name: /communities/i }).click();

      // Should navigate back to communities page
      await expect(page).toHaveURL('/communities');
    }
  });
});

/**
 * Tests for mobile responsive navigation
 */
test.describe.skip('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
  });

  test('should show mobile menu toggle button', async ({ page }) => {
    // Check for hamburger menu button
    const menuToggle = page.getByRole('button', { name: /menu/i });
    await expect(menuToggle).toBeVisible();
  });

  test('should open mobile menu when toggle is clicked', async ({ page }) => {
    const menuToggle = page.getByRole('button', { name: /menu/i });

    // Click menu toggle
    await menuToggle.click();

    // Verify navigation menu appears
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();

    // Verify navigation links are visible
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /communities/i })).toBeVisible();
  });

  test('should close mobile menu after navigation', async ({ page }) => {
    const menuToggle = page.getByRole('button', { name: /menu/i });

    // Open menu
    await menuToggle.click();

    // Click a navigation link
    await page.getByRole('link', { name: /communities/i }).click();

    // Menu should close
    // Note: Implementation-specific behavior
  });
});

/**
 * Tests for keyboard accessibility in navigation
 */
test.describe.skip('Keyboard Accessibility', () => {
  test('should support Enter key for navigation links', async ({ page }) => {
    await page.goto('/');

    // Focus on communities link
    const communitiesLink = page.getByRole('link', { name: /communities/i });
    await communitiesLink.focus();

    // Press Enter
    await page.keyboard.press('Enter');

    // Should navigate to communities page
    await expect(page).toHaveURL('/communities');
  });

  test('should support Space key for buttons', async ({ page }) => {
    await page.goto('/');

    // Find a button (e.g., mobile menu toggle)
    const menuButton = page.getByRole('button', { name: /menu/i });

    if (await menuButton.isVisible()) {
      await menuButton.focus();

      // Press Space
      await page.keyboard.press('Space');

      // Button action should be triggered
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/');

    // Tab through navigation
    await page.keyboard.press('Tab');

    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Note: Visual focus ring testing may require screenshot comparison
  });
});
