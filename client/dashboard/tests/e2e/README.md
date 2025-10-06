# End-to-End Tests with Playwright

This directory contains end-to-end (E2E) tests for the Atrarium Dashboard using Playwright.

## Overview

These tests verify the user interface functionality by simulating real user interactions in a browser environment. They are particularly useful for testing:

- Form input functionality
- User workflows
- UI component behavior
- Keyboard navigation
- Accessibility

## Test Files

### Form and Modal Tests

- **pds-login.spec.ts** - Tests for the PDS Login form
  - Handle and password field input
  - Field validation
  - Password masking
  - Tab navigation

- **create-community.spec.ts** - Tests for the Create Community modal
  - Text input in name and description fields
  - Form validation
  - Keyboard input support
  - Modal open/close behavior

- **create-feed.spec.ts** - Tests for the Create Feed modal
  - Text input functionality
  - Form validation
  - Keyboard navigation

- **create-post.spec.ts** - Tests for post creation workflow
  - Post content textarea input
  - Feed selection from dropdown
  - Hashtag handling
  - Character count validation
  - Form submission and cancellation

### Feature Tests

- **moderation.spec.ts** - Tests for moderation features
  - Moderation log display and filtering
  - Post hiding/unhiding workflow
  - User blocking functionality
  - Moderation reason input
  - Permission-based access control

- **navigation.spec.ts** - Tests for application navigation
  - Sidebar navigation links
  - Header and user menu
  - Page transitions and routing
  - Browser back/forward navigation
  - Breadcrumb navigation
  - Mobile responsive menu
  - Keyboard accessibility

- **community-settings.spec.ts** - Tests for community settings
  - General settings editing (name, description)
  - Feed mix configuration with sliders
  - Member management and role changes
  - Member search and filtering
  - Community deletion workflow
  - Settings permissions

## Running Tests

### Prerequisites

1. Install Playwright browsers (first time only):
   ```bash
   npx playwright install chromium
   ```

2. Make sure the development server is running (Playwright will start it automatically if not):
   ```bash
   npm run dev
   ```

### Run All Tests

```bash
# Run all E2E tests in headless mode
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug
```

### Run Specific Tests

```bash
# Run a specific test file
npx playwright test tests/e2e/create-community.spec.ts

# Run tests matching a pattern
npx playwright test --grep "should allow typing"

# Run a specific test by line number
npx playwright test tests/e2e/create-community.spec.ts:10
```

### View Test Results

After running tests, you can view the HTML report:

```bash
npx playwright show-report
```

## Test Coverage

The E2E test suite covers the following user workflows:

### Core User Flows
1. **Authentication**: PDS login with handle and password
2. **Community Management**: Create, view, and configure communities
3. **Feed Management**: Create and configure theme feeds
4. **Post Creation**: Create posts with hashtags and associate with feeds
5. **Moderation**: Hide posts, block users, view moderation logs
6. **Navigation**: Sidebar, breadcrumb, and mobile navigation

### Integration with Backend
Many tests include `test.skip()` blocks for backend integration scenarios. These tests should be enabled once the backend API is fully integrated:
- Post submission to PDS
- Moderation actions persistence
- Settings changes persistence
- Member role management

## Writing Tests

### Best Practices

1. **Use accessible selectors**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Wait for visibility**: Use `toBeVisible()` before interacting with elements
3. **Test user workflows**: Focus on realistic user scenarios
4. **Keep tests independent**: Each test should be able to run in isolation
5. **Use descriptive test names**: Clearly describe what is being tested
6. **Use data-testid attributes**: For complex UI components, add `data-testid` attributes to make testing easier
7. **Test keyboard accessibility**: Include keyboard navigation tests for important workflows
8. **Handle optional elements**: Use conditional checks for elements that may not always be present

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page before each test
    await page.goto('/your-route');
  });

  test('should do something specific', async ({ page }) => {
    // Arrange: Set up test conditions
    const button = page.getByRole('button', { name: /click me/i });

    // Act: Perform the action
    await button.click();

    // Assert: Verify the result
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

### Testing Optional Elements

Some UI elements may not always be present (e.g., when data hasn't loaded yet). Handle these cases gracefully:

```typescript
test('should handle optional elements', async ({ page }) => {
  // Check if element exists before interacting
  const optionalButton = page.getByRole('button', { name: /optional/i });

  if (await optionalButton.isVisible()) {
    await optionalButton.click();
    // Test behavior when element exists
  } else {
    // Skip test or test alternative behavior
    test.skip();
  }
});
```

### Testing Forms with Validation

```typescript
test('should validate form fields', async ({ page }) => {
  // Open modal
  await page.getByRole('button', { name: /create/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Try to submit without filling required fields
  await page.getByRole('button', { name: /submit/i }).click();

  // Verify validation errors appear
  await expect(page.getByText(/name is required/i)).toBeVisible();

  // Fill in valid data
  await page.getByLabel(/name/i).fill('Valid Name');
  await page.getByRole('button', { name: /submit/i }).click();

  // Modal should close or show success
});
```

### Testing Data Tables

```typescript
test('should display table data', async ({ page }) => {
  // Wait for table to load
  await expect(page.getByRole('table')).toBeVisible();

  // Verify column headers
  await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();

  // Verify first row exists
  const firstRow = page.locator('tbody tr').first();
  await expect(firstRow).toBeVisible();
});
```

## Configuration

Test configuration is defined in [playwright.config.ts](../../playwright.config.ts):

- **Base URL**: http://localhost:5173
- **Browser**: Chromium (Chrome)
- **Timeout**: 30 seconds per test
- **Retries**: 2 in CI, 0 locally
- **Screenshots**: Captured on failure
- **Traces**: Captured on first retry

## Debugging Tests

### Visual Debugging

Use UI mode for interactive debugging:

```bash
npm run test:e2e:ui
```

This opens a browser where you can:
- Step through tests
- Inspect DOM
- View network requests
- See test timeline

### Debug Mode

Run tests in debug mode with Playwright Inspector:

```bash
npm run test:e2e:debug
```

### Add Debug Points

Add `await page.pause()` in your test to pause execution:

```typescript
test('debugging example', async ({ page }) => {
  await page.goto('/communities');
  await page.pause(); // Execution will pause here
  await page.getByRole('button').click();
});
```

## CI Integration

Tests are configured to run in CI environments with:
- Headless mode
- 2 retries on failure
- Single worker (parallel=1)
- HTML report generation

## Test Organization

The test files are organized by feature area:

### UI Component Tests
- Form inputs and validation
- Modal dialogs
- Buttons and interactions

### Workflow Tests
- Multi-step user flows
- Data creation workflows
- Navigation between pages

### Integration Tests (Skipped)
- Backend API integration
- PDS communication
- State persistence

Tests marked with `test.skip()` are placeholders for future backend integration. Enable these tests once the corresponding backend functionality is implemented.

## Troubleshooting

### Tests Timing Out

If tests timeout, you can:
1. Increase timeout in `playwright.config.ts`
2. Use `test.setTimeout(60000)` for specific tests
3. Check if the dev server is running
4. Verify network conditions (especially for backend integration tests)

### Element Not Found

If selectors fail:
1. Use Playwright Inspector to verify selectors: `npx playwright test --debug`
2. Check if elements are conditionally rendered (use `isVisible()` checks)
3. Wait for elements with `waitForSelector()` or `waitForTimeout()`
4. Verify the element uses accessible roles and labels

### Flaky Tests

To reduce flakiness:
1. Use `waitForLoadState('networkidle')` when needed
2. Avoid hard-coded waits (`setTimeout`) - prefer `waitForTimeout()` with short durations
3. Use Playwright's auto-waiting features (built into most locator methods)
4. Ensure tests are independent (each test should set up its own state)
5. Add `data-testid` attributes for dynamic content

### Missing Test Data

Some tests expect specific data (communities, feeds, members) to exist. If you see failures:
1. Check if the test uses conditional logic to skip when data doesn't exist
2. Consider adding test fixtures or mock data
3. Use the PDS setup script to create test accounts and data

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Locators Guide](https://playwright.dev/docs/locators)
