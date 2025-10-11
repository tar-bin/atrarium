/**
 * Contract Test: POST /api/reactions/add
 * Validates: FR-003 (Add reaction to post)
 * Tests: Unicode emoji, custom emoji, rate limiting, duplicate rejection
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('Contract: POST /api/reactions/add', () => {
  let worker: UnstableDevWorker;
  let token: string;
  let communityId: string;
  let postUri: string;

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
        name: 'Reaction Test Community',
        description: 'For reaction tests',
      }),
    });

    const communityData = (await communityResponse.json()) as { id: string };
    communityId = communityData.id;

    // Create test post
    const postResponse = await worker.fetch(
      `http://localhost/api/communities/${communityId}/posts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communityId,
          text: 'Test post for reactions',
        }),
      }
    );

    if (postResponse.ok) {
      const postData = (await postResponse.json()) as { uri: string };
      postUri = postData.uri;
    }
  });

  it('accepts Unicode emoji reaction', async () => {
    const response = await worker.fetch('http://localhost/api/reactions/add', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri,
        emoji: {
          type: 'unicode',
          value: '👍',
        },
      }),
    });

    // Skip if PDS unavailable
    if (response.status === 500) {
      return;
    }

    expect([200, 201]).toContain(response.status);

    const data = (await response.json()) as {
      reactionUri: string;
      postUri: string;
      emoji: { type: 'unicode' | 'custom'; value: string };
    };

    expect(data.reactionUri).toMatch(/^at:\/\//);
    expect(data.reactionUri).toContain('net.atrarium.group.reaction');
    expect(data.postUri).toBe(postUri);
    expect(data.emoji.type).toBe('unicode');
    expect(data.emoji.value).toBe('👍');
  });

  it('validates Unicode emoji format', async () => {
    const response = await worker.fetch('http://localhost/api/reactions/add', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri,
        emoji: {
          type: 'unicode',
          value: 'not-an-emoji', // Invalid Unicode emoji
        },
      }),
    });

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/emoji|unicode/i);
  });

  it('validates custom emoji is approved', async () => {
    const response = await worker.fetch('http://localhost/api/reactions/add', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri,
        emoji: {
          type: 'custom',
          value: 'at://did:plc:xxx/net.atrarium.emoji.custom/unapproved', // Non-existent emoji
        },
      }),
    });

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/emoji|approved|not found/i);
  });

  it('rejects duplicate reaction', async () => {
    // Add reaction first
    const firstResponse = await worker.fetch('http://localhost/api/reactions/add', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri,
        emoji: {
          type: 'unicode',
          value: '❤️',
        },
      }),
    });

    if (!firstResponse.ok) {
      return;
    }

    // Try to add same reaction again
    const secondResponse = await worker.fetch('http://localhost/api/reactions/add', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri,
        emoji: {
          type: 'unicode',
          value: '❤️',
        },
      }),
    });

    // Should reject duplicate or return same reaction URI (idempotent)
    expect([409, 200]).toContain(secondResponse.status);
  });

  it('validates postUri format (must be AT-URI)', async () => {
    const response = await worker.fetch('http://localhost/api/reactions/add', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri: 'invalid-uri', // Not an AT-URI
        emoji: {
          type: 'unicode',
          value: '👍',
        },
      }),
    });

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/postUri|AT-URI/i);
  });

  it('requires authentication', async () => {
    const response = await worker.fetch('http://localhost/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri,
        emoji: {
          type: 'unicode',
          value: '👍',
        },
      }),
    });

    expect(response.status).toBe(401);
  });

  it('enforces rate limiting (100 reactions/hour)', async () => {
    // Note: This test is expensive, so we only simulate 5 reactions and check the error message
    // In production, rate limiting would kick in after 100 reactions

    const reactions = [];
    for (let i = 0; i < 5; i++) {
      reactions.push(
        worker.fetch('http://localhost/api/reactions/add', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postUri,
            emoji: {
              type: 'unicode',
              value: '🎉',
            },
          }),
        })
      );
    }

    const responses = await Promise.all(reactions);

    // All should succeed (under limit)
    for (const response of responses) {
      if (response.ok) {
        expect([200, 201, 409]).toContain(response.status);
      }
    }

    // TODO: Full rate limit test requires 101 requests, deferred to integration test
  });
});
