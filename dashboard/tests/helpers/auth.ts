import type { Page } from '@playwright/test';

/**
 * Mock authentication by setting localStorage session
 */
export async function mockLogin(page: Page) {
  const sessionData = {
    did: 'did:plc:owner',
    handle: 'test.user',
  };

  await page.addInitScript((session) => {
    localStorage.setItem('pds_session', JSON.stringify(session));
  }, sessionData);
}

/**
 * Clear authentication session
 */
export async function mockLogout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('pds_session');
  });
}
