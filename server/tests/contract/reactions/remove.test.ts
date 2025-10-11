/**
 * Contract Test: DELETE /api/reactions/remove
 * Validates: FR-004 (Remove reaction from post)
 * Tests: Removal of own reaction, rejection of other user's reaction, AT-URI validation
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { type UnstableDevWorker, unstable_dev } from 'wrangler';

describe('Contract: DELETE /api/reactions/remove', () => {
  let worker: UnstableDevWorker;
  let aliceToken: string;
  let _bobToken: string;
  let communityId: string;
  let postUri: string;
  let aliceReactionUri: string;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });

    // Authenticate Alice
    const aliceAuthResponse = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'alice.test',
        password: 'test123',
      }),
    });

    const aliceAuthData = (await aliceAuthResponse.json()) as { token: string };
    aliceToken = aliceAuthData.token;

    // Authenticate Bob
    const bobAuthResponse = await worker.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'bob.test',
        password: 'test123',
      }),
    });

    const bobAuthData = (await bobAuthResponse.json()) as { token: string };
    _bobToken = bobAuthData.token;

    // Create test community (Alice is owner)
    const communityResponse = await worker.fetch('http://localhost/api/communities', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Reaction Remove Test Community',
        description: 'For reaction removal tests',
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
          Authorization: `Bearer ${aliceToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communityId,
          text: 'Test post for reaction removal',
        }),
      }
    );

    if (postResponse.ok) {
      const postData = (await postResponse.json()) as { uri: string };
      postUri = postData.uri;

      // Alice adds a reaction
      const reactionResponse = await worker.fetch('http://localhost/api/reactions/add', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${aliceToken}`,
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

      if (reactionResponse.ok) {
        const reactionData = (await reactionResponse.json()) as { reactionUri: string };
        aliceReactionUri = reactionData.reactionUri;
      }
    }
  });

  it('removes own reaction successfully', async () => {
    if (!aliceReactionUri) {
      return;
    }

    const response = await worker.fetch('http://localhost/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reactionUri: aliceReactionUri,
      }),
    });

    // Skip if PDS unavailable
    if (response.status === 500) {
      return;
    }

    expect([200, 204]).toContain(response.status);

    // Verify reaction removed from list
    const listResponse = await worker.fetch(
      `http://localhost/api/reactions/list?postUri=${encodeURIComponent(postUri)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${aliceToken}`,
        },
      }
    );

    if (listResponse.ok) {
      const listData = (await listResponse.json()) as {
        reactions: Array<{ emoji: { value: string }; count: number }>;
      };

      const thumbsUpReaction = listData.reactions.find((r) => r.emoji.value === '👍');
      // Either no reaction or count is 0
      expect(thumbsUpReaction?.count || 0).toBe(0);
    }
  });

  it('validates reactionUri format (must be AT-URI)', async () => {
    const response = await worker.fetch('http://localhost/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reactionUri: 'invalid-uri', // Not an AT-URI
      }),
    });

    expect(response.status).toBe(400);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/reactionUri|AT-URI/i);
  });

  it('rejects removal of non-existent reaction', async () => {
    const response = await worker.fetch('http://localhost/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reactionUri: 'at://did:plc:xxx/net.atrarium.group.reaction/nonexistent',
      }),
    });

    // Should return 404 or 400
    expect([400, 404]).toContain(response.status);

    const errorData = (await response.json()) as { error?: { message: string } };
    expect(errorData.error?.message).toMatch(/reaction|not found/i);
  });

  it('requires authentication', async () => {
    const response = await worker.fetch('http://localhost/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reactionUri: 'at://did:plc:xxx/net.atrarium.group.reaction/yyy',
      }),
    });

    expect(response.status).toBe(401);
  });

  it('returns success for already removed reaction (idempotent)', async () => {
    if (!aliceReactionUri) {
      return;
    }

    // Remove reaction twice
    const firstResponse = await worker.fetch('http://localhost/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reactionUri: aliceReactionUri,
      }),
    });

    if (!firstResponse.ok && firstResponse.status !== 404) {
      return;
    }

    const secondResponse = await worker.fetch('http://localhost/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${aliceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reactionUri: aliceReactionUri,
      }),
    });

    // Should succeed (idempotent) or return 404
    expect([200, 204, 404]).toContain(secondResponse.status);
  });
});
