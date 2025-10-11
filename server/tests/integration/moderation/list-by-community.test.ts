/**
 * Integration Test: Moderation list with communityUri (Scenario 4)
 *
 * Task: T041
 * Reference: quickstart.md lines 334-390
 *
 * Flow:
 * 1. Create community
 * 2. Create post
 * 3. Hide post (moderation action)
 * 4. List moderation actions for community
 * 5. Verify action returned
 */

import { env, SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { ATProtoService } from '../../../src/services/atproto';
import type { Env } from '../../../src/types';

describe('Integration: Moderation list by community', () => {
  let aliceToken: string;
  let _aliceDid: string;
  let communityId: string;
  let communityUri: string;
  let postUri: string;

  beforeAll(async () => {
    const testEnv = env as unknown as Env;
    const _atproto = new ATProtoService(testEnv);

    // Authenticate Alice
    _aliceDid = 'did:plc:alice-test';
    aliceToken = 'mock-alice-jwt';
  });

  it('Scenario 4: Hide post → List moderation actions → Verify action', async () => {
    // Step 1: Create community
    const createResponse = await SELF.fetch('http://fake-host/api/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        name: 'Moderation Test Community',
        description: 'Testing moderation list filtering',
      }),
    });

    expect(createResponse.ok).toBe(true);
    const communityData = (await createResponse.json()) as { id: string; uri: string };
    communityId = communityData.id;
    communityUri = communityData.uri;

    // Step 2: Create post
    const postResponse = await SELF.fetch(`http://fake-host/api/communities/${communityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        communityId,
        text: 'Test post that will be hidden',
      }),
    });

    expect(postResponse.ok).toBe(true);
    const postData = (await postResponse.json()) as { uri: string };
    postUri = postData.uri;

    // Step 3: Hide post (moderation action)
    const hideResponse = await SELF.fetch('http://fake-host/api/moderation/hide-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri,
        communityUri,
        reason: 'spam',
      }),
    });

    expect(hideResponse.ok).toBe(true);
    const hideData = (await hideResponse.json()) as { uri: string; action: string };
    expect(hideData.action).toBe('hide_post');

    // Step 4: List moderation actions for community
    const listResponse = await SELF.fetch(
      `http://fake-host/api/moderation/actions?communityUri=${encodeURIComponent(communityUri)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${aliceToken}`,
        },
      }
    );

    expect(listResponse.ok).toBe(true);
    const listData = (await listResponse.json()) as {
      data: Array<{
        uri: string;
        action: string;
        target: { uri?: string };
        reason?: string;
        createdAt: string;
      }>;
    };

    // Step 5: Verify action returned
    expect(listData.data.length).toBeGreaterThan(0);

    const hideAction = listData.data.find(
      (a) => a.action === 'hide_post' && a.target.uri === postUri
    );
    expect(hideAction).toBeDefined();
    expect(hideAction?.reason).toBe('spam');
    expect(hideAction?.createdAt).toBeDefined();
  });

  it('Verifies PDS write → Firehose → Durable Object indexing', async () => {
    // Create another post and hide it
    const postResponse = await SELF.fetch(`http://fake-host/api/communities/${communityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        communityId,
        text: 'Another test post',
      }),
    });

    expect(postResponse.ok).toBe(true);
    const postData = (await postResponse.json()) as { uri: string };
    const newPostUri = postData.uri;

    // Hide post
    const hideResponse = await SELF.fetch('http://fake-host/api/moderation/hide-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri: newPostUri,
        communityUri,
        reason: 'off_topic',
      }),
    });

    expect(hideResponse.ok).toBe(true);

    // Wait for indexing (simulate Firehose delay)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify post is hidden in feed
    const feedResponse = await SELF.fetch(
      `http://fake-host/api/communities/${communityId}/posts?limit=50`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${aliceToken}`,
        },
      }
    );

    expect(feedResponse.ok).toBe(true);
    const feedData = (await feedResponse.json()) as {
      data: Array<{ uri: string }>;
    };

    // Hidden post should not appear in feed
    const hiddenPost = feedData.data.find((p) => p.uri === newPostUri);
    expect(hiddenPost).toBeUndefined();
  });
});
