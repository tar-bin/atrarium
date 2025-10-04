import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';

describe('Contract: Moderation API endpoints', () => {
  const testCommunityId = 'test-community-mod-003';
  const testFeedId = 'test-feed-mod-003';
  const testHashtag = '#atr_e5f6g7h8';
  const memberDid = 'did:plc:reguser001';
  const moderatorDid = 'did:plc:moduser001';
  const ownerDid = 'did:plc:owneruser001';

  beforeAll(async () => {
    const now = Math.floor(Date.now() / 1000);

    // Create community
    await env.DB.prepare(`
      INSERT INTO communities (id, name, stage, created_at)
      VALUES (?, ?, 'theme', ?)
    `).bind(testCommunityId, 'Moderation Test', now).run();

    // Create feed
    await env.DB.prepare(`
      INSERT INTO theme_feeds (id, community_id, name, hashtag, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(testFeedId, testCommunityId, 'Test Feed', testHashtag, now).run();

    // Add members with different roles
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
      VALUES (?, ?, 'owner', ?)
    `).bind(testCommunityId, ownerDid, now).run();

    // Add test post
    await env.DB.prepare(`
      INSERT INTO post_index (uri, feed_id, author_did, created_at, indexed_at, moderation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      'at://did:plc:reguser001/app.bsky.feed.post/test001',
      testFeedId,
      memberDid,
      now,
      now,
      'approved'
    ).run();
  });

  describe('POST /api/moderation/hide-post', () => {
    it('should return 200 and set moderation_status to hidden', async () => {
      const response = await env.WORKER.fetch('http://localhost/api/moderation/hide-post', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-jwt-${moderatorDid}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postUri: 'at://did:plc:reguser001/app.bsky.feed.post/test001',
          reason: 'Spam content',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as {
        success: boolean;
        postUri: string;
        moderationStatus: string;
      };

      expect(data.success).toBe(true);
      expect(data.moderationStatus).toBe('hidden');

      // Verify database
      const row = await env.DB.prepare(
        'SELECT moderation_status FROM post_index WHERE uri = ?'
      ).bind('at://did:plc:reguser001/app.bsky.feed.post/test001').first<{ moderation_status: string }>();

      expect(row?.moderation_status).toBe('hidden');
    });

    it('should return 403 when non-moderator attempts to hide post', async () => {
      const response = await env.WORKER.fetch('http://localhost/api/moderation/hide-post', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-jwt-${memberDid}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postUri: 'at://did:plc:reguser001/app.bsky.feed.post/test001',
          reason: 'Test',
        }),
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 when post not found in index', async () => {
      const response = await env.WORKER.fetch('http://localhost/api/moderation/hide-post', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-jwt-${moderatorDid}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postUri: 'at://did:plc:user/app.bsky.feed.post/nonexistent',
          reason: 'Test',
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/moderation/unhide-post', () => {
    it('should return 200 and set moderation_status to approved', async () => {
      // First hide the post
      await env.DB.prepare(
        'UPDATE post_index SET moderation_status = ? WHERE uri = ?'
      ).bind('hidden', 'at://did:plc:reguser001/app.bsky.feed.post/test001').run();

      // Then unhide it
      const response = await env.WORKER.fetch('http://localhost/api/moderation/unhide-post', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-jwt-${moderatorDid}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postUri: 'at://did:plc:reguser001/app.bsky.feed.post/test001',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as {
        success: boolean;
        moderationStatus: string;
      };

      expect(data.success).toBe(true);
      expect(data.moderationStatus).toBe('approved');
    });
  });

  describe('POST /api/moderation/block-user', () => {
    it('should return 200 and create blocklist entry', async () => {
      const response = await env.WORKER.fetch('http://localhost/api/moderation/block-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-jwt-${moderatorDid}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userDid: 'did:plc:spammer123',
          feedId: testFeedId,
          reason: 'Repeated spam',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as {
        success: boolean;
        blockedUserDid: string;
        affectedPosts: number;
      };

      expect(data.success).toBe(true);
      expect(data.blockedUserDid).toBe('did:plc:spammer123');

      // Verify blocklist entry
      const row = await env.DB.prepare(
        'SELECT * FROM feed_blocklist WHERE feed_id = ? AND blocked_user_did = ?'
      ).bind(testFeedId, 'did:plc:spammer123').first();

      expect(row).toBeDefined();
    });

    it('should support community-wide blocks', async () => {
      const response = await env.WORKER.fetch('http://localhost/api/moderation/block-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-jwt-${ownerDid}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userDid: 'did:plc:badactor456',
          communityId: testCommunityId,
          reason: 'Harassment',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as {
        affectedFeeds: string[];
      };

      expect(data.affectedFeeds).toContain(testFeedId);
    });
  });

  describe('POST /api/moderation/unblock-user', () => {
    it('should return 200 and remove blocklist entry', async () => {
      // First block the user
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(`
        INSERT INTO feed_blocklist (feed_id, blocked_user_did, blocked_by_did, blocked_at)
        VALUES (?, ?, ?, ?)
      `).bind(testFeedId, 'did:plc:unblocktest', moderatorDid, now).run();

      // Then unblock
      const response = await env.WORKER.fetch('http://localhost/api/moderation/unblock-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-jwt-${moderatorDid}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userDid: 'did:plc:unblocktest',
          feedId: testFeedId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as { success: boolean };
      expect(data.success).toBe(true);

      // Verify removed from blocklist
      const row = await env.DB.prepare(
        'SELECT * FROM feed_blocklist WHERE feed_id = ? AND blocked_user_did = ?'
      ).bind(testFeedId, 'did:plc:unblocktest').first();

      expect(row).toBeNull();
    });
  });

  describe('GET /api/moderation/logs', () => {
    it('should return paginated moderation logs', async () => {
      // Create some moderation logs
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(`
        INSERT INTO moderation_logs (action, target_uri, feed_id, moderator_did, reason, performed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        'hide_post',
        'at://did:plc:test/app.bsky.feed.post/log1',
        testFeedId,
        moderatorDid,
        'Test log',
        now
      ).run();

      const response = await env.WORKER.fetch(
        `http://localhost/api/moderation/logs?feedId=${testFeedId}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer mock-jwt-${moderatorDid}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json() as {
        logs: Array<{
          id: number;
          action: string;
          targetUri: string;
          moderatorDid: string;
        }>;
        cursor?: string;
      };

      expect(data.logs).toBeDefined();
      expect(Array.isArray(data.logs)).toBe(true);
    });

    it('should filter by feedId', async () => {
      const response = await env.WORKER.fetch(
        `http://localhost/api/moderation/logs?feedId=${testFeedId}`,
        {
          headers: {
            'Authorization': `Bearer mock-jwt-${moderatorDid}`,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json() as {
        logs: Array<{ feedId: string | null }>;
      };

      // All returned logs should be for the specified feed
      data.logs.forEach(log => {
        expect(log.feedId).toBe(testFeedId);
      });
    });
  });
});
