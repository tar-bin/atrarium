// Integration Test: Reaction Flow
// TDD: This test MUST FAIL before implementation (T016-T021)
// Scenario: Alice adds 👍 → Bob sees count → Alice removes → count updates

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('Reaction Flow Integration Test', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should handle complete reaction lifecycle: add → list → remove → verify', async () => {
    // Setup: Mock tokens for Alice and Bob
    const aliceToken = 'mock-jwt-token-alice'; // TODO: Generate valid JWT for Alice
    const bobToken = 'mock-jwt-token-bob'; // TODO: Generate valid JWT for Bob
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/integration-test';

    // Step 1: Alice adds 👍 reaction to her post
    const addResp = await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: 'U+1F44D' }, // 👍
      }),
    });

    expect(addResp.status).toBe(200);
    const addData = await addResp.json();
    expect(addData.success).toBe(true);
    expect(addData.reactionUri).toBeDefined();
    const aliceReactionUri = addData.reactionUri;

    // Step 2: Bob lists reactions and sees Alice's reaction
    const listResp1 = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}`,
      {
        headers: { Authorization: `Bearer ${bobToken}` },
      }
    );

    expect(listResp1.status).toBe(200);
    const listData1 = await listResp1.json();
    expect(listData1.reactions).toBeInstanceOf(Array);
    expect(listData1.reactions.length).toBeGreaterThan(0);

    const thumbsUpReaction = listData1.reactions.find(
      (r: { emoji: { value: string } }) => r.emoji.value === 'U+1F44D'
    );
    expect(thumbsUpReaction).toBeDefined();
    expect(thumbsUpReaction.count).toBe(1);
    expect(thumbsUpReaction.reactors).toContain('did:plc:alice');
    expect(thumbsUpReaction.currentUserReacted).toBe(false); // Bob hasn't reacted

    // Step 3: Bob adds his own 👍 reaction
    const bobAddResp = await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: 'U+1F44D' }, // Same emoji as Alice
      }),
    });

    expect(bobAddResp.status).toBe(200);
    const bobAddData = await bobAddResp.json();
    expect(bobAddData.success).toBe(true);
    const bobReactionUri = bobAddData.reactionUri;

    // Step 4: List reactions again, count should be 2
    const listResp2 = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}`,
      {
        headers: { Authorization: `Bearer ${bobToken}` },
      }
    );

    expect(listResp2.status).toBe(200);
    const listData2 = await listResp2.json();
    const thumbsUpReaction2 = listData2.reactions.find(
      (r: { emoji: { value: string } }) => r.emoji.value === 'U+1F44D'
    );
    expect(thumbsUpReaction2.count).toBe(2);
    expect(thumbsUpReaction2.reactors).toHaveLength(2);
    expect(thumbsUpReaction2.reactors).toContain('did:plc:alice');
    expect(thumbsUpReaction2.reactors).toContain('did:plc:bob');
    expect(thumbsUpReaction2.currentUserReacted).toBe(true); // Bob has now reacted

    // Step 5: Alice removes her reaction
    const removeResp = await worker.fetch('/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ reactionUri: aliceReactionUri }),
    });

    expect(removeResp.status).toBe(200);
    const removeData = await removeResp.json();
    expect(removeData.success).toBe(true);

    // Step 6: List reactions again, count should be 1 (only Bob)
    const listResp3 = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}`,
      {
        headers: { Authorization: `Bearer ${bobToken}` },
      }
    );

    expect(listResp3.status).toBe(200);
    const listData3 = await listResp3.json();
    const thumbsUpReaction3 = listData3.reactions.find(
      (r: { emoji: { value: string } }) => r.emoji.value === 'U+1F44D'
    );
    expect(thumbsUpReaction3.count).toBe(1);
    expect(thumbsUpReaction3.reactors).toHaveLength(1);
    expect(thumbsUpReaction3.reactors).toContain('did:plc:bob');
    expect(thumbsUpReaction3.reactors).not.toContain('did:plc:alice');

    // Step 7: Bob removes his reaction
    const bobRemoveResp = await worker.fetch('/api/reactions/remove', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({ reactionUri: bobReactionUri }),
    });

    expect(bobRemoveResp.status).toBe(200);

    // Step 8: List reactions one more time, should be empty
    const listResp4 = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}`,
      {
        headers: { Authorization: `Bearer ${bobToken}` },
      }
    );

    expect(listResp4.status).toBe(200);
    const listData4 = await listResp4.json();
    const thumbsUpReaction4 = listData4.reactions.find(
      (r: { emoji: { value: string } }) => r.emoji.value === 'U+1F44D'
    );
    expect(thumbsUpReaction4).toBeUndefined(); // No more reactions
  });

  it('should handle multiple different emojis on same post', async () => {
    const aliceToken = 'mock-jwt-token-alice';
    const bobToken = 'mock-jwt-token-bob';
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/multi-emoji-test';

    // Alice adds 👍
    await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: 'U+1F44D' }, // 👍
      }),
    });

    // Bob adds ❤️
    await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: 'U+2764' }, // ❤️
      }),
    });

    // Alice adds ❤️ (same as Bob)
    await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: 'U+2764' }, // ❤️
      }),
    });

    // List reactions
    const listResp = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}`,
      {
        headers: { Authorization: `Bearer ${aliceToken}` },
      }
    );

    expect(listResp.status).toBe(200);
    const listData = await listResp.json();
    expect(listData.reactions.length).toBe(2); // Two different emoji types

    const thumbsUp = listData.reactions.find(
      (r: { emoji: { value: string } }) => r.emoji.value === 'U+1F44D'
    );
    const heart = listData.reactions.find(
      (r: { emoji: { value: string } }) => r.emoji.value === 'U+2764'
    );

    expect(thumbsUp.count).toBe(1); // Only Alice
    expect(heart.count).toBe(2); // Both Alice and Bob
  });

  it('should handle custom emoji reactions', async () => {
    const aliceToken = 'mock-jwt-token-alice';
    const bobToken = 'mock-jwt-token-bob';
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/custom-emoji-test';

    // Upload a custom emoji (as Alice)
    const formData = new FormData();
    formData.append('shortcode', 'integration_custom');
    formData.append('file', new Blob(['fake-image-data'], { type: 'image/png' }));

    const uploadResp = await worker.fetch('/api/emoji/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceToken}` },
      body: formData,
    });
    const uploadData = await uploadResp.json();
    const customEmojiURI = uploadData.emojiURI;

    // Approve the custom emoji (as community owner - assume Alice is owner)
    await worker.fetch('/api/communities/a1b2c3d4/emoji/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        communityId: 'a1b2c3d4',
        emojiURI: customEmojiURI,
        approve: true,
      }),
    });

    // Bob reacts with custom emoji
    const reactResp = await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'custom', value: customEmojiURI },
      }),
    });

    expect(reactResp.status).toBe(200);

    // List reactions
    const listResp = await worker.fetch(
      `/api/reactions/list?postUri=${encodeURIComponent(postUri)}`,
      {
        headers: { Authorization: `Bearer ${bobToken}` },
      }
    );

    expect(listResp.status).toBe(200);
    const listData = await listResp.json();
    const customReaction = listData.reactions.find(
      (r: { emoji: { type: string } }) => r.emoji.type === 'custom'
    );

    expect(customReaction).toBeDefined();
    expect(customReaction.emoji.value).toBe(customEmojiURI);
    expect(customReaction.count).toBe(1);
    expect(customReaction.reactors).toContain('did:plc:bob');
  });

  it('should prevent duplicate reactions from same user', async () => {
    const aliceToken = 'mock-jwt-token-alice';
    const postUri = 'at://did:plc:alice/net.atrarium.community.post/duplicate-test';

    // First reaction (should succeed)
    const resp1 = await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: 'U+1F44D' },
      }),
    });

    expect(resp1.status).toBe(200);

    // Duplicate reaction (should fail)
    const resp2 = await worker.fetch('/api/reactions/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        postUri,
        emoji: { type: 'unicode', value: 'U+1F44D' },
      }),
    });

    expect(resp2.status).toBe(409); // Conflict
  });
});
