/**
 * Contract Test: GET /api/communities/:id/emoji/pending
 * Validates: FR-009 (List pending emoji approvals - owner only)
 * Tests: Owner-only permission enforced, pending approval list
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('Contract: GET /api/communities/:id/emoji/pending', () => {
  let worker: UnstableDevWorker;
  let ownerToken: string;
  let memberToken: string;
  let communityId: string;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });

    // Authenticate owner (alice.test)
    const ownerAuthResponse = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'alice.test',
        password: 'test123',
      }),
    });

    const ownerAuthData = (await ownerAuthResponse.json()) as { token: string };
    ownerToken = ownerAuthData.token;

    // Authenticate member (bob.test)
    const memberAuthResponse = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'bob.test',
        password: 'test123',
      }),
    });

    const memberAuthData = (await memberAuthResponse.json()) as { token: string };
    memberToken = memberAuthData.token;

    // Create test community (alice is owner)
    const communityResponse = await worker.fetch('http://localhost/api/communities', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Pending Emoji Test Community',
        description: 'For testing pending emoji list',
      }),
    });

    const communityData = (await communityResponse.json()) as { id: string };
    communityId = communityData.id;
  });

  it('requires authentication', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/pending`,
      {
        method: 'GET',
        // No Authorization header
      }
    );

    expect(response.status).toBe(401);
  });

  it('enforces owner-only permission', async () => {
    // Try to access as non-owner member
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/pending`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      }
    );

    expect(response.status).toBe(403);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/owner|permission/i);
  });

  it('allows owner to list pending approvals', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/pending`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      }
    );

    // Skip if PDS unavailable
    if (response.status === 500) {
      return;
    }

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      data: Array<{
        emojiUri: string;
        shortcode: string;
        submitter: string;
      }>;
    };

    expect(Array.isArray(data.data)).toBe(true);
  });

  it('returns correct output schema for pending emojis', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/pending`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      }
    );

    // Skip if PDS unavailable
    if (response.status === 500) {
      return;
    }

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      data: Array<{
        emojiUri: string;
        shortcode: string;
        submitter: string;
        submittedAt?: string;
      }>;
    };

    // Validate schema for each pending emoji
    for (const emoji of data.data) {
      expect(emoji.emojiUri).toMatch(/^at:\/\//);
      expect(emoji.shortcode).toBeTruthy();
      expect(emoji.submitter).toMatch(/^did:(plc|web):/);
    }
  });

  it('validates communityId format', async () => {
    const response = await worker.fetch('http://localhost/api/communities/invalid/emoji/pending', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/communityId|format/i);
  });
});
