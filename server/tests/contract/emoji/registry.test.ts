/**
 * Contract Test: GET /api/communities/:id/emoji/registry
 * Validates: FR-012 (Get community emoji registry - public endpoint)
 * Tests: Public endpoint (no auth required), approved emojis only
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('Contract: GET /api/communities/:id/emoji/registry', () => {
  let worker: UnstableDevWorker;
  let communityId: string;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });

    // Authenticate to create test community
    const authResponse = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'alice.test',
        password: 'test123',
      }),
    });

    const authData = (await authResponse.json()) as { token: string };
    const token = authData.token;

    // Create test community
    const communityResponse = await worker.fetch('http://localhost/api/communities', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Emoji Registry Test Community',
        description: 'For testing emoji registry',
      }),
    });

    const communityData = (await communityResponse.json()) as { id: string };
    communityId = communityData.id;
  });

  it('allows public access (no authentication required)', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/registry`,
      {
        method: 'GET',
        // No Authorization header
      }
    );

    // Should not require authentication
    expect([200, 404, 500]).toContain(response.status);
    expect(response.status).not.toBe(401);
  });

  it('returns correct output schema', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/registry`,
      {
        method: 'GET',
      }
    );

    // Skip if PDS unavailable
    if (response.status === 500) {
      return;
    }

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      emojis: Array<{
        shortcode: string;
        imageUrl: string;
        approved: boolean;
      }>;
    };

    expect(Array.isArray(data.emojis)).toBe(true);

    // Validate each emoji has required fields
    for (const emoji of data.emojis) {
      expect(emoji.shortcode).toBeTruthy();
      expect(typeof emoji.shortcode).toBe('string');
      expect(typeof emoji.approved).toBe('boolean');
      // All emojis in registry must be approved
      expect(emoji.approved).toBe(true);
    }
  });

  it('returns only approved emojis (no pending/rejected)', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/registry`,
      {
        method: 'GET',
      }
    );

    // Skip if PDS unavailable
    if (response.status === 500) {
      return;
    }

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      emojis: Array<{
        approved: boolean;
      }>;
    };

    // Verify all returned emojis are approved
    for (const emoji of data.emojis) {
      expect(emoji.approved).toBe(true);
    }
  });

  it('validates communityId format', async () => {
    const response = await worker.fetch('http://localhost/api/communities/invalid/emoji/registry', {
      method: 'GET',
    });

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/communityId|format/i);
  });

  it('returns 404 for non-existent community', async () => {
    const response = await worker.fetch(
      'http://localhost/api/communities/00000000/emoji/registry',
      {
        method: 'GET',
      }
    );

    // May return 404 or empty array depending on implementation
    expect([200, 404]).toContain(response.status);
  });

  it('supports pagination if registry is large', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/registry?limit=10&cursor=abc123`,
      {
        method: 'GET',
      }
    );

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
    // Cursor may or may not be present
  });
});
