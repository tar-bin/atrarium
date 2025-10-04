import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';

describe('Integration: Hashtag indexing flow (end-to-end)', () => {
  const testCommunityId = 'test-community-hashtag-flow-001';
  const testFeedId = 'test-feed-hashtag-flow-001';
  const testHashtag = '#atr_1a2b3c4d';
  const memberDid = 'did:plc:hashtag-flow-user001';

  beforeAll(async () => {
    const now = Math.floor(Date.now() / 1000);

    // Create community
    await env.DB.prepare(`
      INSERT INTO communities (id, name, stage, created_at)
      VALUES (?, ?, 'theme', ?)
    `).bind(testCommunityId, 'Hashtag Flow Test Community', now).run();

    // Create feed with hashtag
    await env.DB.prepare(`
      INSERT INTO theme_feeds (id, community_id, name, hashtag, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(testFeedId, testCommunityId, 'Hashtag Flow Feed', testHashtag, now).run();

    // Add member
    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'member', ?)
    `).bind(testCommunityId, memberDid, now).run();
  });

  it('should complete full flow: create post → index → retrieve in feed skeleton', async () => {
    // Step 1: User posts to feed with hashtag appended
    const postResponse = await env.WORKER.fetch('http://localhost/api/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-jwt-${memberDid}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedId: testFeedId,
        text: 'Testing end-to-end hashtag flow!',
      }),
    });

    expect(postResponse.status).toBe(201);
    const postData = await postResponse.json() as {
      postUri: string;
      hashtags: string[];
      finalText: string;
    };

    expect(postData.hashtags).toContain(testHashtag);
    expect(postData.finalText).toContain(testHashtag);

    // Step 2: Simulate Firehose indexing (Durable Object would do this)
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(`
      INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      postData.postUri,
      testFeedId,
      memberDid,
      now,
      now,
      'approved'
    ).run();

    // Step 3: Retrieve post from feed skeleton
    const feedUri = `at://did:plc:feedgen/app.bsky.feed.generator/${testFeedId}`;
    const feedResponse = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}&limit=10`
    );

    expect(feedResponse.status).toBe(200);
    const feedData = await feedResponse.json() as {
      feed: Array<{ post: string }>;
    };

    // Verify the post appears in feed
    const foundPost = feedData.feed.find(item => item.post === postData.postUri);
    expect(foundPost).toBeDefined();
  });

  it('should filter out posts without valid membership during indexing', async () => {
    const nonMemberDid = 'did:plc:nonmember999';
    const now = Math.floor(Date.now() / 1000);

    // Simulate Firehose receiving post with correct hashtag but from non-member
    const nonMemberPostUri = 'at://did:plc:nonmember999/app.bsky.feed.post/test001';
    await env.DB.prepare(`
      INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      nonMemberPostUri,
      testFeedId,
      nonMemberDid,
      now,
      now,
      'approved'
    ).run();

    // Retrieve feed skeleton
    const feedUri = `at://did:plc:feedgen/app.bsky.feed.generator/${testFeedId}`;
    const response = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const data = await response.json() as {
      feed: Array<{ post: string }>;
    };

    // Non-member's post should not appear (filtered by membership JOIN)
    const nonMemberPost = data.feed.find(p => p.post === nonMemberPostUri);
    expect(nonMemberPost).toBeUndefined();
  });
});
