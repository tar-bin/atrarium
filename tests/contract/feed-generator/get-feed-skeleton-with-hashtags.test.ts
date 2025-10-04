import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';

describe('Contract: GET /xrpc/app.bsky.feed.getFeedSkeleton (updated)', () => {
  const testCommunityId = 'test-community-feed-002';
  const testFeedId = 'test-feed-moderation-002';
  const testHashtag = '#atr_a1b2c3d4';
  const memberDid = 'did:plc:member123';
  const nonMemberDid = 'did:plc:nonmember456';
  const blockedUserDid = 'did:plc:blocked789';

  beforeAll(async () => {
    const now = Math.floor(Date.now() / 1000);

    // Create community
    await env.DB.prepare(`
      INSERT INTO communities (id, name, stage, created_at)
      VALUES (?, ?, 'theme', ?)
    `).bind(testCommunityId, 'Moderation Test Community', now).run();

    // Create feed
    await env.DB.prepare(`
      INSERT INTO theme_feeds (id, community_id, name, hashtag, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(testFeedId, testCommunityId, 'Moderation Feed', testHashtag, now).run();

    // Add members
    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'member', ?)
    `).bind(testCommunityId, memberDid, now).run();

    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'member', ?)
    `).bind(testCommunityId, blockedUserDid, now).run();

    // Insert posts with different moderation statuses
    await env.DB.prepare(`
      INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      'at://did:plc:member123/app.bsky.feed.post/approved1',
      testFeedId,
      memberDid,
      now,
      now,
      'approved'
    ).run();

    await env.DB.prepare(`
      INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      'at://did:plc:member123/app.bsky.feed.post/hidden1',
      testFeedId,
      memberDid,
      now - 10,
      now - 10,
      'hidden'
    ).run();

    await env.DB.prepare(`
      INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      'at://did:plc:blocked789/app.bsky.feed.post/blocked1',
      testFeedId,
      blockedUserDid,
      now - 5,
      now - 5,
      'approved'
    ).run();

    await env.DB.prepare(`
      INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      'at://did:plc:nonmember456/app.bsky.feed.post/nonmember1',
      testFeedId,
      nonMemberDid,
      now - 15,
      now - 15,
      'approved'
    ).run();

    // Block one user
    await env.DB.prepare(`
      INSERT INTO feed_blocklist (feed_id, blocked_user_did, blocked_by_did, blocked_at)
      VALUES (?, ?, ?, ?)
    `).bind(testFeedId, blockedUserDid, 'did:plc:moderator', now).run();
  });

  it('should return only approved posts from current members', async () => {
    // This test will fail until feed-generator route is updated with moderation filtering
    const feedUri = `at://did:plc:feedgen/app.bsky.feed.generator/${testFeedId}`;
    const response = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}&limit=10`
    );

    expect(response.status).toBe(200);
    const data = await response.json() as {
      feed: Array<{ post: string }>;
      cursor?: string;
    };

    // Should only include the approved post from member123
    expect(data.feed).toHaveLength(1);
    expect(data.feed[0].post).toBe('at://did:plc:member123/app.bsky.feed.post/approved1');
  });

  it('should exclude hidden posts (moderation_status=hidden)', async () => {
    const feedUri = `at://did:plc:feedgen/app.bsky.feed.generator/${testFeedId}`;
    const response = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const data = await response.json() as { feed: Array<{ post: string }> };

    // Hidden post should not appear
    const hiddenPost = data.feed.find(p => p.post.includes('hidden1'));
    expect(hiddenPost).toBeUndefined();
  });

  it('should exclude posts from blocked users', async () => {
    const feedUri = `at://did:plc:feedgen/app.bsky.feed.generator/${testFeedId}`;
    const response = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const data = await response.json() as { feed: Array<{ post: string }> };

    // Blocked user's post should not appear
    const blockedPost = data.feed.find(p => p.post.includes('blocked789'));
    expect(blockedPost).toBeUndefined();
  });

  it('should exclude posts from non-members', async () => {
    const feedUri = `at://did:plc:feedgen/app.bsky.feed.generator/${testFeedId}`;
    const response = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const data = await response.json() as { feed: Array<{ post: string }> };

    // Non-member's post should not appear (membership JOIN fails)
    const nonMemberPost = data.feed.find(p => p.post.includes('nonmember456'));
    expect(nonMemberPost).toBeUndefined();
  });

  it('should support pagination with cursor', async () => {
    // Add more posts for pagination test
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < 55; i++) {
      await env.DB.prepare(`
        INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        `at://did:plc:member123/app.bsky.feed.post/page${i}`,
        testFeedId,
        memberDid,
        now + i,
        now + i,
        'approved'
      ).run();
    }

    const feedUri = `at://did:plc:feedgen/app.bsky.feed.generator/${testFeedId}`;
    const response = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}&limit=50`
    );

    const data = await response.json() as {
      feed: Array<{ post: string }>;
      cursor?: string;
    };

    expect(data.feed.length).toBeLessThanOrEqual(50);
    expect(data.cursor).toBeDefined();
  });
});
