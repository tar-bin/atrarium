import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';

describe('Contract: POST /api/posts with hashtag appending', () => {
  const testCommunityId = 'test-community-001';
  const testFeedId = 'test-feed-tech-001';
  const testHashtag = '#atr_f7a3b2c1';
  const memberDid = 'did:plc:testuser456';
  const nonMemberDid = 'did:plc:nonmember999';
  const moderatorDid = 'did:plc:moduser789';

  beforeAll(async () => {
    // Setup test data
    const now = Math.floor(Date.now() / 1000);

    // Create community
    await env.DB.prepare(`
      INSERT INTO communities (id, name, stage, created_at)
      VALUES (?, ?, 'theme', ?)
    `).bind(testCommunityId, 'Test Community', now).run();

    // Create feed with hashtag
    await env.DB.prepare(`
      INSERT INTO theme_feeds (id, community_id, name, hashtag, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(testFeedId, testCommunityId, 'Tech Topics', testHashtag, now).run();

    // Add member
    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'member', ?)
    `).bind(testCommunityId, memberDid, now).run();

    // Add moderator
    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'moderator', ?)
    `).bind(testCommunityId, moderatorDid, now).run();
  });

  it('should return 201 with hashtag when valid member posts', async () => {
    // This test will fail until POST /api/posts is implemented with hashtag appending
    const response = await env.WORKER.fetch('http://localhost/api/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-jwt-${memberDid}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedId: testFeedId,
        text: 'Just deployed a new Cloudflare Worker!',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json() as {
      postUri: string;
      hashtags: string[];
      finalText: string;
    };

    expect(data.hashtags).toEqual([testHashtag]);
    expect(data.finalText).toContain(testHashtag);
    expect(data.postUri).toMatch(/^at:\/\//);
  });

  it('should return 403 when non-member attempts to post', async () => {
    const response = await env.WORKER.fetch('http://localhost/api/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-jwt-${nonMemberDid}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedId: testFeedId,
        text: 'Trying to post as non-member',
      }),
    });

    expect(response.status).toBe(403);
    const data = await response.json() as { error: string; code: string };
    expect(data.code).toBe('NOT_A_MEMBER');
  });

  it('should return 400 when feedId does not exist', async () => {
    const response = await env.WORKER.fetch('http://localhost/api/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-jwt-${memberDid}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedId: 'non-existent-feed',
        text: 'Testing invalid feed',
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json() as { error: string; code: string };
    expect(data.code).toBe('FEED_NOT_FOUND');
  });

  it('should return 429 when rate limit exceeded (10 posts/min)', async () => {
    // Post 10 times rapidly
    for (let i = 0; i < 10; i++) {
      await env.WORKER.fetch('http://localhost/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-jwt-${memberDid}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedId: testFeedId,
          text: `Rate limit test post ${i}`,
        }),
      });
    }

    // 11th post should be rate limited
    const response = await env.WORKER.fetch('http://localhost/api/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-jwt-${memberDid}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedId: testFeedId,
        text: 'This should be rate limited',
      }),
    });

    expect(response.status).toBe(429);
    const data = await response.json() as { error: string; code: string };
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(response.headers.has('Retry-After')).toBe(true);
  });
});
