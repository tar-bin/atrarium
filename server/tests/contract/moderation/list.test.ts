/**
 * Contract Test: GET /api/moderation/actions (with communityUri)
 *
 * Task: T040
 * Validates: FR-018, FR-019 (Moderation.list fix)
 *
 * Tests:
 * - Test 1: communityUri parameter filtering works
 * - Test 2: admin-only permission enforced
 * - Test 3: ModerationActionListOutputSchema validation
 * - Test 4: Empty result for community with no actions
 */

import { env, SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { ATProtoService } from '../../../src/services/atproto';
import type { Env } from '../../../src/types';

describe('Moderation Contract: list', () => {
  let aliceToken: string;
  let bobToken: string;
  let aliceDid: string;
  let bobDid: string;
  let communityId: string;
  let postUri: string;
  let moderationActionUri: string;

  beforeAll(async () => {
    // Setup: Create test users, community, post, and moderation action
    const testEnv = env as unknown as Env;
    const _atproto = new ATProtoService(testEnv);

    // Authenticate users (assuming test accounts exist)
    aliceDid = 'did:plc:alice-test';
    bobDid = 'did:plc:bob-test';

    // Generate JWT tokens (simplified for test)
    aliceToken = 'mock-alice-jwt';
    bobToken = 'mock-bob-jwt';

    // Create community (via oRPC router)
    const createResponse = await SELF.fetch('http://fake-host/api/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        name: 'Test Community for Moderation',
        description: 'Testing moderation.list contract',
      }),
    });

    expect(createResponse.ok).toBe(true);
    const createData = (await createResponse.json()) as { id: string };
    communityId = createData.id;

    // Create post
    const postResponse = await SELF.fetch(`http://fake-host/api/communities/${communityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        communityId,
        text: 'Test post for moderation',
      }),
    });

    expect(postResponse.ok).toBe(true);
    const postData = (await postResponse.json()) as { uri: string };
    postUri = postData.uri;

    // Create moderation action (hide post)
    const modResponse = await SELF.fetch('http://fake-host/api/moderation/hide-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri,
        communityUri: `at://${aliceDid}/net.atrarium.group.config/${communityId}`,
        reason: 'spam',
      }),
    });

    expect(modResponse.ok).toBe(true);
    const modData = (await modResponse.json()) as { uri: string };
    moderationActionUri = modData.uri;
  });

  it('Test 1: Returns actions filtered by communityUri', async () => {
    const communityUri = `at://${aliceDid}/net.atrarium.group.config/${communityId}`;

    const response = await SELF.fetch(
      `http://fake-host/api/moderation/actions?communityUri=${encodeURIComponent(communityUri)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${aliceToken}`,
        },
      }
    );

    expect(response.ok).toBe(true);

    const data = (await response.json()) as {
      data: Array<{
        uri: string;
        action: string;
        target: { uri?: string };
        reason?: string;
      }>;
    };

    // Validate response structure (ModerationActionListOutputSchema)
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);

    // Should contain the action we created
    const hideAction = data.data.find((a) => a.uri === moderationActionUri);
    expect(hideAction).toBeDefined();
    expect(hideAction?.action).toBe('hide_post');
    expect(hideAction?.target.uri).toBe(postUri);
    expect(hideAction?.reason).toBe('spam');
  });

  it('Test 2: Rejects non-admin users (FORBIDDEN)', async () => {
    const communityUri = `at://${aliceDid}/net.atrarium.group.config/${communityId}`;

    // Bob is not a moderator/owner of alice's community
    const response = await SELF.fetch(
      `http://fake-host/api/moderation/actions?communityUri=${encodeURIComponent(communityUri)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bobToken}`,
        },
      }
    );

    expect(response.status).toBe(403);

    const error = (await response.json()) as { error: { message: string } };
    expect(error.error.message).toContain('permission');
  });

  it('Test 3: Returns empty array for community with no actions', async () => {
    // Create a new community with no moderation actions
    const newCommunityResponse = await SELF.fetch('http://fake-host/api/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({
        name: 'Clean Community',
        description: 'No moderation needed',
      }),
    });

    expect(newCommunityResponse.ok).toBe(true);
    const newCommunityData = (await newCommunityResponse.json()) as { id: string };
    const cleanCommunityUri = `at://${bobDid}/net.atrarium.group.config/${newCommunityData.id}`;

    const response = await SELF.fetch(
      `http://fake-host/api/moderation/actions?communityUri=${encodeURIComponent(cleanCommunityUri)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bobToken}`,
        },
      }
    );

    expect(response.ok).toBe(true);

    const data = (await response.json()) as { data: unknown[] };
    expect(data.data).toEqual([]);
  });

  it('Test 4: Validates communityUri parameter is required', async () => {
    // Call without communityUri parameter
    const response = await SELF.fetch('http://fake-host/api/moderation/actions', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${aliceToken}`,
      },
    });

    // Should return validation error (BAD_REQUEST)
    expect(response.status).toBe(400);

    const error = (await response.json()) as { error: { message: string } };
    expect(error.error.message).toContain('communityUri');
  });
});
