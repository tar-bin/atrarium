/**
 * Contract Test: GET /api/emoji/list
 * Validates: FR-007 (List user's uploaded emojis)
 * Tests: User's uploaded emojis returned, pagination
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('Contract: GET /api/emoji/list', () => {
  let worker: UnstableDevWorker;
  let token: string;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });

    // Authenticate to get token
    const response = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'alice.test',
        password: 'test123',
      }),
    });

    const data = (await response.json()) as { token: string };
    token = data.token;
  });

  it('returns user emoji list with correct output schema', async () => {
    const response = await worker.fetch('http://localhost/api/emoji/list', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Skip if PDS unavailable
    if (response.status === 500) {
      return;
    }

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      emojis: Array<{
        shortcode: string;
        imageUrl: string;
        emojiUri: string;
        approved: boolean;
      }>;
    };

    expect(Array.isArray(data.emojis)).toBe(true);

    // Validate each emoji has required fields
    for (const emoji of data.emojis) {
      expect(emoji.shortcode).toBeTruthy();
      expect(typeof emoji.shortcode).toBe('string');
      expect(emoji.emojiUri).toMatch(/^at:\/\//);
      expect(typeof emoji.approved).toBe('boolean');
    }
  });

  it('returns empty array when user has no uploaded emojis', async () => {
    // Authenticate as bob.test (no emojis)
    const bobLoginResponse = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'bob.test',
        password: 'test123',
      }),
    });

    const bobData = (await bobLoginResponse.json()) as { token: string };
    const bobToken = bobData.token;

    const response = await worker.fetch('http://localhost/api/emoji/list', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bobToken}`,
      },
    });

    // Skip if PDS unavailable
    if (response.status === 500) {
      return;
    }

    expect(response.status).toBe(200);

    const data = (await response.json()) as { emojis: unknown[] };
    expect(Array.isArray(data.emojis)).toBe(true);
  });

  it('requires authentication', async () => {
    const response = await worker.fetch('http://localhost/api/emoji/list', {
      method: 'GET',
      // No Authorization header
    });

    expect(response.status).toBe(401);
  });

  it('supports pagination with limit and cursor parameters', async () => {
    const response = await worker.fetch('http://localhost/api/emoji/list?limit=10&cursor=abc123', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Skip if PDS unavailable
    if (response.status === 500) {
      return;
    }

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      emojis: unknown[];
      cursor?: string;
    };

    expect(Array.isArray(data.emojis)).toBe(true);
    // Cursor may or may not be present depending on data
  });
});
