// Integration Test: Queue to Feed Flow
// Validates the complete Firehose → Queue → CommunityFeedGenerator → getFeedSkeleton flow
// Tests lightweight filter, heavyweight filter, membership verification, and moderation

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { env } from 'cloudflare:test';

// NOTE: These tests are designed for the PDS-first architecture (006-pds-1-db)
// They validate the Queue → CommunityFeedGenerator → getFeedSkeleton flow
// IMPORTANT: Queue consumer tests require deployed Workers environment
// These tests are SKIPPED in local test environment (Miniflare limitations)
// Run these tests in production/staging environment after deployment

interface JetstreamEvent {
  did: string;
  time_us: number;
  kind: string;
  commit?: {
    record?: {
      text?: string;
      createdAt?: string;
      [key: string]: unknown;
    };
    operation: string;
    collection: string;
    rkey: string;
  };
}

describe.skip('Queue to Feed Flow Integration (requires deployed environment)', () => {
  const testCommunityId = 'design-community';
  const testHashtag = '#atrarium_12345678';
  const aliceDid = 'did:plc:alice123';
  const bobDid = 'did:plc:bob456';
  const charlieDid = 'did:plc:charlie789';

  beforeAll(async () => {
    // Initialize CommunityFeedGenerator Durable Object
    const communityId = env.COMMUNITY_FEED.idFromName(testCommunityId);
    const communityStub = env.COMMUNITY_FEED.get(communityId);

    // Configure community
    await communityStub.fetch(new Request('http://test/updateConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Design Community',
        description: 'A community for designers',
        hashtag: testHashtag,
        stage: 'theme',
        createdAt: new Date().toISOString(),
      }),
    }));

    // Add Alice as owner/moderator
    await communityStub.fetch(new Request('http://test/addMember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: aliceDid,
        role: 'owner',
        joinedAt: new Date().toISOString(),
        active: true,
      }),
    }));

    // Add Bob as member
    await communityStub.fetch(new Request('http://test/addMember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: bobDid,
        role: 'member',
        joinedAt: new Date().toISOString(),
        active: true,
      }),
    }));
  });

  afterAll(async () => {
    // Cleanup: Optional, Durable Objects are ephemeral in test environment
  });

  it('should process Firehose event through Queue to Community DO', async () => {
    // Step 1: Mock Jetstream event with correct hashtag
    const mockEvent: JetstreamEvent = {
      did: bobDid,
      time_us: Date.now() * 1000,
      kind: 'commit',
      commit: {
        operation: 'create',
        collection: 'app.bsky.feed.post',
        rkey: 'test123',
        record: {
          text: `Test post ${testHashtag}`,
          createdAt: new Date().toISOString(),
        },
      },
    };

    // Step 2: Send to Queue
    await env.FIREHOSE_EVENTS.send(mockEvent);

    // Step 3: Wait for Queue processing (FirehoseProcessor Worker)
    // NOTE: In test environment, Queue consumer runs automatically
    // but we need to wait for async processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Verify post was indexed in CommunityFeedGenerator DO
    const communityId = env.COMMUNITY_FEED.idFromName(testCommunityId);
    const stub = env.COMMUNITY_FEED.get(communityId);

    // Step 5: Call getFeedSkeleton
    const response = await stub.fetch(new Request('http://test/getFeedSkeleton?limit=10'));
    expect(response.ok).toBe(true);

    const result = await response.json() as {
      feed: Array<{ post: string }>;
      cursor?: string;
    };

    // Step 6: Verify post appears in feed
    expect(result.feed).toBeDefined();
    expect(result.feed.length).toBeGreaterThan(0);

    const expectedUri = `at://${bobDid}/app.bsky.feed.post/test123`;
    const foundPost = result.feed.find(item => item.post === expectedUri);
    expect(foundPost).toBeDefined();
  });

  it('should filter posts without #atrarium_ hashtag (lightweight filter)', async () => {
    const mockEvent: JetstreamEvent = {
      did: bobDid,
      time_us: Date.now() * 1000,
      kind: 'commit',
      commit: {
        operation: 'create',
        collection: 'app.bsky.feed.post',
        rkey: 'test456',
        record: {
          text: 'Post without hashtag',
          createdAt: new Date().toISOString(),
        },
      },
    };

    await env.FIREHOSE_EVENTS.send(mockEvent);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // This event should be filtered out by FirehoseReceiver (lightweight filter)
    // and never reach CommunityFeedGenerator
    const communityId = env.COMMUNITY_FEED.idFromName(testCommunityId);
    const stub = env.COMMUNITY_FEED.get(communityId);

    const response = await stub.fetch(new Request('http://test/getFeedSkeleton?limit=10'));
    const result = await response.json() as {
      feed: Array<{ post: string }>;
    };

    // Post without hashtag should NOT appear
    const unexpectedUri = `at://${bobDid}/app.bsky.feed.post/test456`;
    const foundPost = result.feed.find(item => item.post === unexpectedUri);
    expect(foundPost).toBeUndefined();
  });

  it('should reject posts from non-members (membership verification)', async () => {
    const mockEvent: JetstreamEvent = {
      did: charlieDid, // Charlie is NOT a member
      time_us: Date.now() * 1000,
      kind: 'commit',
      commit: {
        operation: 'create',
        collection: 'app.bsky.feed.post',
        rkey: 'test789',
        record: {
          text: `Non-member post ${testHashtag}`,
          createdAt: new Date().toISOString(),
        },
      },
    };

    await env.FIREHOSE_EVENTS.send(mockEvent);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Post should pass lightweight/heavyweight filters but fail membership check
    const communityId = env.COMMUNITY_FEED.idFromName(testCommunityId);
    const stub = env.COMMUNITY_FEED.get(communityId);

    const response = await stub.fetch(new Request('http://test/getFeedSkeleton?limit=10'));
    const result = await response.json() as {
      feed: Array<{ post: string }>;
    };

    // Non-member's post should NOT appear
    const unexpectedUri = `at://${charlieDid}/app.bsky.feed.post/test789`;
    const foundPost = result.feed.find(item => item.post === unexpectedUri);
    expect(foundPost).toBeUndefined();
  });

  it('should handle moderation actions (hide post)', async () => {
    // Step 1: Index a post from Bob
    const mockEvent: JetstreamEvent = {
      did: bobDid,
      time_us: Date.now() * 1000,
      kind: 'commit',
      commit: {
        operation: 'create',
        collection: 'app.bsky.feed.post',
        rkey: 'moderate123',
        record: {
          text: `Test moderation ${testHashtag}`,
          createdAt: new Date().toISOString(),
        },
      },
    };

    await env.FIREHOSE_EVENTS.send(mockEvent);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const targetUri = `at://${bobDid}/app.bsky.feed.post/moderate123`;
    const communityId = env.COMMUNITY_FEED.idFromName(testCommunityId);
    const stub = env.COMMUNITY_FEED.get(communityId);

    // Step 2: Verify post appears in feed
    let response = await stub.fetch(new Request('http://test/getFeedSkeleton?limit=10'));
    let result = await response.json() as {
      feed: Array<{ post: string }>;
    };

    let foundPost = result.feed.find(item => item.post === targetUri);
    expect(foundPost).toBeDefined();

    // Step 3: Alice moderates the post (hide)
    const moderationAction = {
      action: 'hide_post',
      targetUri,
      reason: 'Test moderation',
      createdAt: new Date().toISOString(),
    };

    const moderateResponse = await stub.fetch(new Request('http://test/moderatePost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moderationAction),
    }));

    expect(moderateResponse.ok).toBe(true);

    // Step 4: Verify post is hidden in feed
    response = await stub.fetch(new Request('http://test/getFeedSkeleton?limit=10'));
    result = await response.json() as {
      feed: Array<{ post: string }>;
    };

    // Hidden post should not appear in feed
    foundPost = result.feed.find(item => item.post === targetUri);
    expect(foundPost).toBeUndefined();
  });

  it('should handle batch processing of multiple posts', async () => {
    const batchEvents: JetstreamEvent[] = [];

    // Create 5 posts from Bob
    for (let i = 0; i < 5; i++) {
      batchEvents.push({
        did: bobDid,
        time_us: Date.now() * 1000 + i,
        kind: 'commit',
        commit: {
          operation: 'create',
          collection: 'app.bsky.feed.post',
          rkey: `batch${i}`,
          record: {
            text: `Batch post ${i} ${testHashtag}`,
            createdAt: new Date().toISOString(),
          },
        },
      });
    }

    // Send all events to Queue (batch processing)
    for (const event of batchEvents) {
      await env.FIREHOSE_EVENTS.send(event);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify all 5 posts were indexed
    const communityId = env.COMMUNITY_FEED.idFromName(testCommunityId);
    const stub = env.COMMUNITY_FEED.get(communityId);

    const response = await stub.fetch(new Request('http://test/getFeedSkeleton?limit=50'));
    const result = await response.json() as {
      feed: Array<{ post: string }>;
    };

    // Count batch posts
    const batchPosts = result.feed.filter(item =>
      item.post.includes('/batch') && item.post.includes(bobDid)
    );

    expect(batchPosts.length).toBe(5);
  });

  it('should handle cleanup of old posts (7-day retention)', async () => {
    const communityId = env.COMMUNITY_FEED.idFromName(testCommunityId);
    const stub = env.COMMUNITY_FEED.get(communityId);

    // Index a post with old timestamp (8 days ago)
    const oldPost = {
      uri: `at://${bobDid}/app.bsky.feed.post/oldpost`,
      authorDid: bobDid,
      text: `Old post ${testHashtag}`,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      hashtags: [testHashtag],
    };

    await stub.fetch(new Request('http://test/indexPost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(oldPost),
    }));

    // Trigger cleanup
    const cleanupResponse = await stub.fetch(new Request('http://test/cleanup', {
      method: 'POST',
    }));

    expect(cleanupResponse.ok).toBe(true);

    // Verify old post was removed
    const response = await stub.fetch(new Request('http://test/getFeedSkeleton?limit=50'));
    const result = await response.json() as {
      feed: Array<{ post: string }>;
    };

    const oldPostFound = result.feed.find(item => item.post === oldPost.uri);
    expect(oldPostFound).toBeUndefined();
  });
});
