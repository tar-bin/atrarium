// Integration Test: Emoji Upload & Approval Flow (T027)
// Scenario 3 from quickstart.md (lines 217-332)
// Test: Upload → Submit → Pending → Approve → Use in reaction

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UnstableDevWorker } from 'wrangler';
import { unstable_dev } from 'wrangler';

describe('Emoji Approval Flow Integration Test', () => {
  let worker: UnstableDevWorker;
  let aliceToken: string;
  let bobToken: string;
  let communityId: string;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });

    // Setup: Create test accounts and community
    // Note: In real tests, use proper JWT generation
    aliceToken = 'mock-jwt-token-alice-owner';
    bobToken = 'mock-jwt-token-bob-member';
    communityId = 'testcmty'; // 8-char community ID
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should handle complete emoji lifecycle: upload → submit → pending → approve → use in reaction', async () => {
    // Step 1: Alice (member) uploads custom emoji to her PDS
    const uploadResponse = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        shortcode: 'party_parrot',
        fileData:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1x1 PNG
        mimeType: 'image/png',
        size: 95,
        dimensions: { width: 1, height: 1 },
        animated: false,
      }),
    });

    expect(uploadResponse.status).toBe(200);
    const uploadData = (await uploadResponse.json()) as {
      uri: string;
      shortcode: string;
      approved: boolean;
    };
    expect(uploadData.uri).toBeDefined();
    expect(uploadData.shortcode).toBe('party_parrot');
    expect(uploadData.approved).toBe(false); // Not approved yet

    const emojiUri = uploadData.uri;

    // Step 2: Alice submits emoji to community registry (requires membership)
    const submitResponse = await worker.fetch(`/api/communities/${communityId}/emoji/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        communityId,
        emojiUri,
      }),
    });

    expect(submitResponse.status).toBe(200);
    const submitData = (await submitResponse.json()) as {
      success: boolean;
      status: string;
    };
    expect(submitData.success).toBe(true);
    expect(submitData.status).toBe('pending');

    // Step 3: Bob (community owner) lists pending emoji approvals
    const pendingResponse = await worker.fetch(`/api/communities/${communityId}/emoji/pending`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bobToken}`, // Owner token
      },
    });

    expect(pendingResponse.status).toBe(200);
    const pendingData = (await pendingResponse.json()) as {
      data: Array<{
        uri: string;
        shortcode: string;
        creatorDid: string;
        approved: boolean;
      }>;
    };
    expect(pendingData.data).toBeInstanceOf(Array);
    expect(pendingData.data.length).toBeGreaterThan(0);

    const pendingEmoji = pendingData.data.find((e) => e.uri === emojiUri);
    expect(pendingEmoji).toBeDefined();
    expect(pendingEmoji?.shortcode).toBe('party_parrot');
    expect(pendingEmoji?.approved).toBe(false);

    // Step 4: Bob (owner) approves the emoji
    const approveResponse = await worker.fetch(`/api/communities/${communityId}/emoji/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`, // Owner token
      },
      body: JSON.stringify({
        communityId,
        emojiUri,
        approve: true, // true = approve, false = reject
      }),
    });

    expect(approveResponse.status).toBe(200);
    const approveData = (await approveResponse.json()) as {
      uri: string;
      approved: boolean;
    };
    expect(approveData.uri).toBeDefined();
    expect(approveData.approved).toBe(true);

    // Step 5: Verify emoji appears in public registry
    const registryResponse = await worker.fetch(`/api/communities/${communityId}/emoji/registry`, {
      method: 'GET',
      // No auth required (public endpoint)
    });

    expect(registryResponse.status).toBe(200);
    const registryData = (await registryResponse.json()) as {
      data: Array<{
        uri: string;
        shortcode: string;
        approved: boolean;
      }>;
    };
    expect(registryData.data).toBeInstanceOf(Array);

    const approvedEmoji = registryData.data.find((e) => e.uri === emojiUri);
    expect(approvedEmoji).toBeDefined();
    expect(approvedEmoji?.shortcode).toBe('party_parrot');
    expect(approvedEmoji?.approved).toBe(true);

    // Step 6: Alice uses approved custom emoji in reaction
    const postUri = 'at://did:plc:alice/net.atrarium.group.post/test123';

    const reactionResponse = await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'custom', value: 'party_parrot' }, // Use shortcode
        communityId,
      }),
    });

    expect(reactionResponse.status).toBe(200);
    const reactionData = (await reactionResponse.json()) as {
      success: boolean;
      reactionUri: string;
    };
    expect(reactionData.success).toBe(true);
    expect(reactionData.reactionUri).toBeDefined();

    // Step 7: Verify reaction appears in post reactions
    const listReactionResponse = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}`,
      {
        headers: {
          Authorization: `Bearer ${aliceToken}`,
        },
      }
    );

    expect(listReactionResponse.status).toBe(200);
    const listReactionData = (await listReactionResponse.json()) as {
      reactions: Array<{
        emoji: { type: string; value: string };
        count: number;
        reactors: string[];
        currentUserReacted: boolean;
      }>;
    };

    const customReaction = listReactionData.reactions.find(
      (r) => r.emoji.type === 'custom' && r.emoji.value === 'party_parrot'
    );
    expect(customReaction).toBeDefined();
    expect(customReaction?.count).toBe(1);
    expect(customReaction?.currentUserReacted).toBe(true);
  });

  it('should reject unapproved custom emoji in reactions', async () => {
    // Step 1: Alice uploads emoji but does NOT submit/approve it
    const uploadResponse = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        shortcode: 'unapproved_emoji',
        fileData:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        size: 95,
        dimensions: { width: 1, height: 1 },
        animated: false,
      }),
    });

    expect(uploadResponse.status).toBe(200);
    await uploadResponse.json(); // Consume response body

    // Step 2: Try to use unapproved emoji in reaction (should fail)
    const postUri = 'at://did:plc:alice/net.atrarium.group.post/test456';

    const reactionResponse = await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'custom', value: 'unapproved_emoji' },
        communityId,
      }),
    });

    expect(reactionResponse.status).toBe(400); // BAD_REQUEST
    const errorData = (await reactionResponse.json()) as { error?: string };
    expect(errorData.error).toContain('not approved'); // Error message should mention approval
  });

  it('should allow owner to revoke approved emoji', async () => {
    // Step 1: Upload, submit, and approve an emoji (abbreviated)
    const uploadResponse = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        shortcode: 'revoke_test',
        fileData:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        size: 95,
        dimensions: { width: 1, height: 1 },
        animated: false,
      }),
    });

    const uploadData = (await uploadResponse.json()) as { uri: string };
    const emojiUri = uploadData.uri;

    // Submit to community
    await worker.fetch(`/api/communities/${communityId}/emoji/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ communityId, emojiUri }),
    });

    // Approve emoji
    await worker.fetch(`/api/communities/${communityId}/emoji/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({ communityId, emojiUri, approve: true }),
    });

    // Step 2: Owner revokes the emoji
    const revokeResponse = await worker.fetch(`/api/communities/${communityId}/emoji/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`, // Owner token
      },
      body: JSON.stringify({
        communityId,
        emojiUri,
      }),
    });

    expect(revokeResponse.status).toBe(200);
    const revokeData = (await revokeResponse.json()) as { success: boolean };
    expect(revokeData.success).toBe(true);

    // Step 3: Verify emoji no longer in registry
    const registryResponse = await worker.fetch(`/api/communities/${communityId}/emoji/registry`, {
      method: 'GET',
    });

    expect(registryResponse.status).toBe(200);
    const registryData = (await registryResponse.json()) as {
      data: Array<{ uri: string; shortcode: string }>;
    };

    const revokedEmoji = registryData.data.find((e) => e.uri === emojiUri);
    expect(revokedEmoji).toBeUndefined(); // Should not be in registry

    // Step 4: Try to use revoked emoji in reaction (should fail)
    const postUri = 'at://did:plc:alice/net.atrarium.group.post/revoke-test';

    const reactionResponse = await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'custom', value: 'revoke_test' },
        communityId,
      }),
    });

    expect(reactionResponse.status).toBe(400); // BAD_REQUEST
  });

  it('should prevent non-owner from approving emoji', async () => {
    // Step 1: Upload and submit emoji
    const uploadResponse = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        shortcode: 'permission_test',
        fileData:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        size: 95,
        dimensions: { width: 1, height: 1 },
        animated: false,
      }),
    });

    const uploadData = (await uploadResponse.json()) as { uri: string };
    const emojiUri = uploadData.uri;

    await worker.fetch(`/api/communities/${communityId}/emoji/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ communityId, emojiUri }),
    });

    // Step 2: Alice (non-owner member) tries to approve (should fail)
    const approveResponse = await worker.fetch(`/api/communities/${communityId}/emoji/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`, // Non-owner token
      },
      body: JSON.stringify({ communityId, emojiUri, approve: true }),
    });

    expect(approveResponse.status).toBe(403); // FORBIDDEN
  });
});
