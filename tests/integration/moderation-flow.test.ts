import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';

describe('Integration: Moderation flow', () => {
  const testCommunityId = 'test-community-mod-flow-001';
  const testFeedId = 'test-feed-mod-flow-001';
  const testHashtag = '#atr_9z8y7x6w';
  const memberDid = 'did:plc:mod-flow-member001';
  const moderatorDid = 'did:plc:mod-flow-moderator001';
  const spammerDid = 'did:plc:spammer-flow-001';

  beforeAll(async () => {
    const now = Math.floor(Date.now() / 1000);

    // Create community
    await env.DB.prepare(`
      INSERT INTO communities (id, name, stage, created_at)
      VALUES (?, ?, 'theme', ?)
    `).bind(testCommunityId, 'Moderation Flow Community', now).run();

    // Create feed
    await env.DB.prepare(`
      INSERT INTO theme_feeds (id, community_id, name, hashtag, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(testFeedId, testCommunityId, 'Moderation Flow Feed', testHashtag, now).run();

    // Add members
    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'member', ?)
    `).bind(testCommunityId, memberDid, now).run();

    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'moderator', ?)
    `).bind(testCommunityId, moderatorDid, now).run();

    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'member', ?)
    `).bind(testCommunityId, spammerDid, now).run();
  });

  it('should complete moderation flow: post → hide → verify hidden → unhide → verify visible', async () => {
    const now = Math.floor(Date.now() / 1000);
    const testPostUri = 'at://did:plc:mod-flow-member001/app.bsky.feed.post/flow001';

    // Step 1: Create test post
    await env.DB.prepare(`
      INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(testPostUri, testFeedId, memberDid, now, now, 'approved').run();

    // Step 2: Hide the post
    const hideResponse = await env.WORKER.fetch('http://localhost/api/moderation/hide-post', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-jwt-${moderatorDid}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri: testPostUri,
        reason: 'Inappropriate content',
      }),
    });

    expect(hideResponse.status).toBe(200);
    const hideData = await hideResponse.json() as {
      success: boolean;
      moderationStatus: string;
    };
    expect(hideData.moderationStatus).toBe('hidden');

    // Step 3: Verify post is hidden in feed skeleton
    const feedUri = `at://did:plc:feedgen/app.bsky.feed.generator/${testFeedId}`;
    const feedResponse1 = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const feedData1 = await feedResponse1.json() as {
      feed: Array<{ post: string }>;
    };
    const hiddenPost = feedData1.feed.find(p => p.post === testPostUri);
    expect(hiddenPost).toBeUndefined();

    // Step 4: Unhide the post
    const unhideResponse = await env.WORKER.fetch('http://localhost/api/moderation/unhide-post', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-jwt-${moderatorDid}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri: testPostUri,
      }),
    });

    expect(unhideResponse.status).toBe(200);
    const unhideData = await unhideResponse.json() as {
      success: boolean;
      moderationStatus: string;
    };
    expect(unhideData.moderationStatus).toBe('approved');

    // Step 5: Verify post is visible again in feed skeleton
    const feedResponse2 = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const feedData2 = await feedResponse2.json() as {
      feed: Array<{ post: string }>;
    };
    const visiblePost = feedData2.feed.find(p => p.post === testPostUri);
    expect(visiblePost).toBeDefined();
  });

  it('should complete block flow: block user → verify posts hidden → unblock → verify posts visible', async () => {
    const now = Math.floor(Date.now() / 1000);
    const spamPostUri = 'at://did:plc:spammer-flow-001/app.bsky.feed.post/spam001';

    // Step 1: Create spam post
    await env.DB.prepare(`
      INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(spamPostUri, testFeedId, spammerDid, now, now, 'approved').run();

    // Step 2: Block the spammer
    const blockResponse = await env.WORKER.fetch('http://localhost/api/moderation/block-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-jwt-${moderatorDid}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userDid: spammerDid,
        feedId: testFeedId,
        reason: 'Repeated spam violations',
      }),
    });

    expect(blockResponse.status).toBe(200);
    const blockData = await blockResponse.json() as {
      success: boolean;
      blockedUserDid: string;
    };
    expect(blockData.blockedUserDid).toBe(spammerDid);

    // Step 3: Verify blocked user's posts don't appear in feed
    const feedUri = `at://did:plc:feedgen/app.bsky.feed.generator/${testFeedId}`;
    const feedResponse1 = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const feedData1 = await feedResponse1.json() as {
      feed: Array<{ post: string }>;
    };
    const blockedPost = feedData1.feed.find(p => p.post === spamPostUri);
    expect(blockedPost).toBeUndefined();

    // Step 4: Unblock the user
    const unblockResponse = await env.WORKER.fetch('http://localhost/api/moderation/unblock-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-jwt-${moderatorDid}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userDid: spammerDid,
        feedId: testFeedId,
      }),
    });

    expect(unblockResponse.status).toBe(200);

    // Step 5: Verify user's posts appear again in feed
    const feedResponse2 = await env.WORKER.fetch(
      `http://localhost/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feedUri)}`
    );

    const feedData2 = await feedResponse2.json() as {
      feed: Array<{ post: string }>;
    };
    const unblockedPost = feedData2.feed.find(p => p.post === spamPostUri);
    expect(unblockedPost).toBeDefined();
  });

  it('should log all moderation actions in moderation_logs table', async () => {
    const now = Math.floor(Date.now() / 1000);
    const testPostUri = 'at://did:plc:mod-flow-member001/app.bsky.feed.post/log001';

    // Create test post
    await env.DB.prepare(`
      INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(testPostUri, testFeedId, memberDid, now, now, 'approved').run();

    // Perform moderation action
    await env.WORKER.fetch('http://localhost/api/moderation/hide-post', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-jwt-${moderatorDid}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postUri: testPostUri,
        reason: 'Test logging',
      }),
    });

    // Verify log entry created
    const logsResponse = await env.WORKER.fetch(
      `http://localhost/api/moderation/logs?feedId=${testFeedId}`,
      {
        headers: {
          'Authorization': `Bearer mock-jwt-${moderatorDid}`,
        },
      }
    );

    expect(logsResponse.status).toBe(200);
    const logsData = await logsResponse.json() as {
      logs: Array<{
        action: string;
        targetUri: string;
        moderatorDid: string;
        reason?: string;
      }>;
    };

    const logEntry = logsData.logs.find(
      log => log.targetUri === testPostUri && log.action === 'hide_post'
    );
    expect(logEntry).toBeDefined();
    expect(logEntry?.moderatorDid).toBe(moderatorDid);
    expect(logEntry?.reason).toBe('Test logging');
  });
});
