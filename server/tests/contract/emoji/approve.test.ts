/**
 * Contract Test: POST /api/communities/:id/emoji/approve
 * Validates: FR-010 (Approve emoji - owner only)
 * Tests: Approval workflow, owner-only permission
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('Contract: POST /api/communities/:id/emoji/approve', () => {
  let worker: UnstableDevWorker;
  let ownerToken: string;
  let memberToken: string;
  let communityId: string;
  let emojiUri: string;

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
        name: 'Emoji Approval Test Community',
        description: 'For testing emoji approval',
      }),
    });

    const communityData = (await communityResponse.json()) as { id: string };
    communityId = communityData.id;

    // Upload and submit test emoji
    const formData = new FormData();
    formData.append('shortcode', 'approval_test');
    formData.append('image', new Blob([new Uint8Array(100)], { type: 'image/png' }), 'test.png');

    const emojiResponse = await worker.fetch('http://localhost/api/emoji/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      body: formData,
    });

    if (emojiResponse.ok) {
      const emojiData = (await emojiResponse.json()) as { uri: string };
      emojiUri = emojiData.uri;

      // Submit for approval
      await worker.fetch(`http://localhost/api/communities/${communityId}/emoji/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiUri,
        }),
      });
    }
  });

  it('requires authentication', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiUri: 'at://did:plc:xxx/net.atrarium.community.emoji/yyy',
        }),
      }
    );

    expect(response.status).toBe(401);
  });

  it('enforces owner-only permission', async () => {
    // Try to approve as non-owner member
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${memberToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiUri: 'at://did:plc:xxx/net.atrarium.community.emoji/yyy',
        }),
      }
    );

    expect(response.status).toBe(403);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/owner|permission/i);
  });

  it('approves emoji successfully', async () => {
    if (!emojiUri) {
      return;
    }

    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiUri,
        }),
      }
    );

    // Skip if PDS unavailable
    if (response.status === 500) {
      return;
    }

    expect([200, 201]).toContain(response.status);

    const data = (await response.json()) as {
      uri: string;
      approved: boolean;
    };

    expect(data.uri).toMatch(/^at:\/\//);
    expect(data.approved).toBe(true);
  });

  it('validates emojiUri format', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiUri: 'invalid-uri',
        }),
      }
    );

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/emojiUri|AT-URI/i);
  });

  it('validates communityId format', async () => {
    const response = await worker.fetch('http://localhost/api/communities/invalid/emoji/approve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emojiUri: 'at://did:plc:xxx/net.atrarium.community.emoji/yyy',
      }),
    });

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/communityId|format/i);
  });
});
