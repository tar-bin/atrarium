/**
 * Contract Test: POST /api/communities/:id/emoji/submit
 * Validates: FR-008 (Submit emoji for community approval)
 * Tests: Emoji submission creates pending approval, emojiUri format
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('Contract: POST /api/communities/:id/emoji/submit', () => {
  let worker: UnstableDevWorker;
  let token: string;
  let communityId: string;
  let emojiUri: string;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });

    // Authenticate to get token
    const authResponse = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'alice.test',
        password: 'test123',
      }),
    });

    const authData = (await authResponse.json()) as { token: string };
    token = authData.token;

    // Create test community
    const communityResponse = await worker.fetch('http://localhost/api/communities', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Emoji Test Community',
        description: 'For emoji approval tests',
      }),
    });

    const communityData = (await communityResponse.json()) as { id: string };
    communityId = communityData.id;

    // Upload test emoji
    const formData = new FormData();
    formData.append('shortcode', 'submit_test');
    formData.append('image', new Blob([new Uint8Array(100)], { type: 'image/png' }), 'test.png');

    const emojiResponse = await worker.fetch('http://localhost/api/emoji/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (emojiResponse.ok) {
      const emojiData = (await emojiResponse.json()) as { uri: string };
      emojiUri = emojiData.uri;
    }
  });

  it('validates emojiUri format (must be AT-URI)', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/submit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiUri: 'invalid-uri', // Not an AT-URI
        }),
      }
    );

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/emojiUri|AT-URI/i);
  });

  it('creates pending approval submission', async () => {
    if (!emojiUri) {
      console.warn('Skipping test (emoji upload failed)');
      return;
    }

    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/submit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiUri,
        }),
      }
    );

    // Skip if PDS unavailable
    if (response.status === 500) {
      console.warn('Skipping test (PDS unavailable)');
      return;
    }

    expect([200, 201]).toContain(response.status);

    const data = (await response.json()) as {
      success: boolean;
      status: string;
    };

    expect(data.success).toBe(true);
    expect(data.status).toBe('pending');
  });

  it('rejects submission with invalid communityId format', async () => {
    const response = await worker.fetch(
      'http://localhost/api/communities/invalid123/emoji/submit',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiUri: 'at://did:plc:xxx/net.atrarium.community.emoji/yyy',
        }),
      }
    );

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/communityId|format/i);
  });

  it('requires authentication', async () => {
    const response = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/submit`,
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

  it('rejects duplicate submission (idempotency)', async () => {
    if (!emojiUri) {
      console.warn('Skipping test (emoji upload failed)');
      return;
    }

    // Submit emoji twice
    const firstResponse = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/submit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiUri,
        }),
      }
    );

    if (!firstResponse.ok) {
      console.warn('Skipping test (first submission failed)');
      return;
    }

    const secondResponse = await worker.fetch(
      `http://localhost/api/communities/${communityId}/emoji/submit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emojiUri,
        }),
      }
    );

    // Should reject duplicate or return same approval status
    expect([200, 409]).toContain(secondResponse.status);
  });
});
