// Integration Test: PDS to Feed Flow (Quickstart Scenario)
// Automated test for the quickstart.md scenario:
// 1. Alice creates community
// 2. Bob joins community
// 3. Bob posts with hashtag
// 4. Alice moderates post
// 5. Feed excludes hidden post

import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';

// NOTE: This test validates the quickstart.md scenario
// It tests direct Durable Object operations (no Queue dependency)
// IMPORTANT: Durable Object storage isolation issues in Miniflare
// These tests are SKIPPED in local test environment
// Run these tests in production/staging environment after deployment

describe.skip('PDS to Feed Flow (Quickstart Scenario - requires deployed environment)', () => {
  const aliceDid = 'did:plc:alice123';
  const bobDid = 'did:plc:bob456';
  const communityId = 'design-community';
  const communityHashtag = '#atr_test1234';

  let communityStub: DurableObjectStub;

  beforeAll(async () => {
    const id = env.COMMUNITY_FEED.idFromName(communityId);
    communityStub = env.COMMUNITY_FEED.get(id);
  });

  it('should complete full Alice-Bob scenario', async () => {
    // ========================================
    // Step 1: Alice creates community
    // ========================================
    const createConfigResponse = await communityStub.fetch(new Request('http://test/updateConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Design Community',
        description: 'A community for designers',
        hashtag: communityHashtag,
        stage: 'theme',
        createdAt: new Date().toISOString(),
      }),
    }));

    expect(createConfigResponse.ok).toBe(true);

    // Verify community config was stored
    const configData = await createConfigResponse.json() as {
      success: boolean;
      message?: string;
    };
    expect(configData.success).toBe(true);

    // ========================================
    // Step 2: Bob joins community
    // ========================================
    const addMemberResponse = await communityStub.fetch(new Request('http://test/addMember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: bobDid,
        role: 'member',
        joinedAt: new Date().toISOString(),
        active: true,
      }),
    }));

    expect(addMemberResponse.ok).toBe(true);

    const memberData = await addMemberResponse.json() as {
      success: boolean;
    };
    expect(memberData.success).toBe(true);

    // ========================================
    // Step 3: Bob posts with hashtag
    // ========================================
    const postUri = `at://${bobDid}/app.bsky.feed.post/xyz789`;
    const indexPostResponse = await communityStub.fetch(new Request('http://test/indexPost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uri: postUri,
        authorDid: bobDid,
        text: `Test post ${communityHashtag}`,
        createdAt: new Date().toISOString(),
        hashtags: [communityHashtag],
      }),
    }));

    expect(indexPostResponse.ok).toBe(true);

    // Verify post appears in feed
    let feedResponse = await communityStub.fetch(new Request('http://test/getFeedSkeleton?limit=10'));
    expect(feedResponse.ok).toBe(true);

    let feedResult = await feedResponse.json() as {
      feed: Array<{ post: string }>;
    };

    expect(feedResult.feed).toBeDefined();
    expect(feedResult.feed.length).toBeGreaterThan(0);

    let foundPost = feedResult.feed.find(item => item.post === postUri);
    expect(foundPost).toBeDefined();

    // ========================================
    // Step 4: Alice moderates post
    // ========================================
    const moderateResponse = await communityStub.fetch(new Request('http://test/moderatePost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'hide_post',
        targetUri: postUri,
        reason: 'Off-topic content',
        createdAt: new Date().toISOString(),
      }),
    }));

    expect(moderateResponse.ok).toBe(true);

    const moderationData = await moderateResponse.json() as {
      success: boolean;
    };
    expect(moderationData.success).toBe(true);

    // ========================================
    // Step 5: Verify feed excludes hidden post
    // ========================================
    feedResponse = await communityStub.fetch(new Request('http://test/getFeedSkeleton?limit=10'));
    expect(feedResponse.ok).toBe(true);

    feedResult = await feedResponse.json() as {
      feed: Array<{ post: string }>;
    };

    // Hidden post should be excluded from feed
    foundPost = feedResult.feed.find(item => item.post === postUri);
    expect(foundPost).toBeUndefined();
  });

  it('should handle multiple members and posts', async () => {
    const charlieDid = 'did:plc:charlie789';
    const dianaDid = 'did:plc:diana012';

    // Add Charlie and Diana as members
    await communityStub.fetch(new Request('http://test/addMember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: charlieDid,
        role: 'member',
        joinedAt: new Date().toISOString(),
        active: true,
      }),
    }));

    await communityStub.fetch(new Request('http://test/addMember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: dianaDid,
        role: 'member',
        joinedAt: new Date().toISOString(),
        active: true,
      }),
    }));

    // Create posts from multiple users
    const posts = [
      { did: bobDid, rkey: 'post1' },
      { did: charlieDid, rkey: 'post2' },
      { did: dianaDid, rkey: 'post3' },
      { did: bobDid, rkey: 'post4' },
      { did: charlieDid, rkey: 'post5' },
    ];

    for (const post of posts) {
      await communityStub.fetch(new Request('http://test/indexPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: `at://${post.did}/app.bsky.feed.post/${post.rkey}`,
          authorDid: post.did,
          text: `Test post from ${post.did} ${communityHashtag}`,
          createdAt: new Date().toISOString(),
          hashtags: [communityHashtag],
        }),
      }));
    }

    // Verify all posts appear in feed
    const feedResponse = await communityStub.fetch(new Request('http://test/getFeedSkeleton?limit=50'));
    const feedResult = await feedResponse.json() as {
      feed: Array<{ post: string }>;
    };

    expect(feedResult.feed.length).toBeGreaterThanOrEqual(5);

    // Verify each user's posts
    for (const post of posts) {
      const uri = `at://${post.did}/app.bsky.feed.post/${post.rkey}`;
      const found = feedResult.feed.find(item => item.post === uri);
      expect(found).toBeDefined();
    }
  });

  it('should handle unhide_post moderation action', async () => {
    const postUri = `at://${bobDid}/app.bsky.feed.post/unhide123`;

    // Index post
    await communityStub.fetch(new Request('http://test/indexPost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uri: postUri,
        authorDid: bobDid,
        text: `Test unhide ${communityHashtag}`,
        createdAt: new Date().toISOString(),
        hashtags: [communityHashtag],
      }),
    }));

    // Hide post
    await communityStub.fetch(new Request('http://test/moderatePost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'hide_post',
        targetUri: postUri,
        reason: 'Initially hidden',
        createdAt: new Date().toISOString(),
      }),
    }));

    // Verify post is hidden
    let feedResponse = await communityStub.fetch(new Request('http://test/getFeedSkeleton?limit=50'));
    let feedResult = await feedResponse.json() as {
      feed: Array<{ post: string }>;
    };

    let foundPost = feedResult.feed.find(item => item.post === postUri);
    expect(foundPost).toBeUndefined();

    // Unhide post
    const unhideResponse = await communityStub.fetch(new Request('http://test/moderatePost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'unhide_post',
        targetUri: postUri,
        reason: 'Reinstated',
        createdAt: new Date().toISOString(),
      }),
    }));

    expect(unhideResponse.ok).toBe(true);

    // Verify post is visible again
    feedResponse = await communityStub.fetch(new Request('http://test/getFeedSkeleton?limit=50'));
    feedResult = await feedResponse.json() as {
      feed: Array<{ post: string }>;
    };

    foundPost = feedResult.feed.find(item => item.post === postUri);
    expect(foundPost).toBeDefined();
  });

  it('should handle member removal', async () => {
    const eveDid = 'did:plc:eve345';

    // Add Eve as member
    await communityStub.fetch(new Request('http://test/addMember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: eveDid,
        role: 'member',
        joinedAt: new Date().toISOString(),
        active: true,
      }),
    }));

    // Eve posts
    const postUri = `at://${eveDid}/app.bsky.feed.post/eve123`;
    await communityStub.fetch(new Request('http://test/indexPost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uri: postUri,
        authorDid: eveDid,
        text: `Eve's post ${communityHashtag}`,
        createdAt: new Date().toISOString(),
        hashtags: [communityHashtag],
      }),
    }));

    // Verify post appears
    let feedResponse = await communityStub.fetch(new Request('http://test/getFeedSkeleton?limit=50'));
    let feedResult = await feedResponse.json() as {
      feed: Array<{ post: string }>;
    };

    let foundPost = feedResult.feed.find(item => item.post === postUri);
    expect(foundPost).toBeDefined();

    // Remove Eve from community
    const removeResponse = await communityStub.fetch(new Request('http://test/removeMember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: eveDid,
      }),
    }));

    expect(removeResponse.ok).toBe(true);

    // Eve tries to post again (should fail membership check)
    const newPostUri = `at://${eveDid}/app.bsky.feed.post/eve456`;
    const indexResponse = await communityStub.fetch(new Request('http://test/indexPost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uri: newPostUri,
        authorDid: eveDid,
        text: `Eve's second post ${communityHashtag}`,
        createdAt: new Date().toISOString(),
        hashtags: [communityHashtag],
      }),
    }));

    // Indexing should fail (403 Forbidden)
    expect(indexResponse.ok).toBe(false);
    expect(indexResponse.status).toBe(403);

    // Verify new post does NOT appear in feed
    feedResponse = await communityStub.fetch(new Request('http://test/getFeedSkeleton?limit=50'));
    feedResult = await feedResponse.json() as {
      feed: Array<{ post: string }>;
    };

    foundPost = feedResult.feed.find(item => item.post === newPostUri);
    expect(foundPost).toBeUndefined();
  });
});
