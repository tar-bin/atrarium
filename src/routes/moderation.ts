import { Hono } from 'hono';
import type { Env, HonoVariables } from '../types';
import { AuthService } from '../services/auth';
import { ModerationService } from '../services/moderation';
import { ModerationLogModel } from '../models/moderation-log';
import { MembershipModel } from '../models/membership';

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// ============================================================================
// Middleware: JWT Authentication
// ============================================================================

app.use('*', async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const authService = new AuthService(c.env);
    const userDid = await authService.extractUserFromHeader(authHeader);
    c.set('userDid', userDid);
    await next();
  } catch (err) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or missing JWT' }, 401);
  }
});

// ============================================================================
// Helper: Check moderator role
// ============================================================================

async function checkModeratorRole(
  c: any,
  communityId: string
): Promise<{ isModerator: boolean; error?: Response }> {
  const userDid = c.get('userDid') as string;
  const membershipModel = new MembershipModel(c.env);
  const membership = await membershipModel.getByUserAndCommunity(communityId, userDid);

  if (!membership) {
    return {
      isModerator: false,
      error: c.json({ error: 'Forbidden', message: 'Not a member of this community' }, 403),
    };
  }

  if (membership.role !== 'moderator' && membership.role !== 'owner') {
    return {
      isModerator: false,
      error: c.json(
        { error: 'Forbidden', message: 'Moderator or owner role required' },
        403
      ),
    };
  }

  return { isModerator: true };
}

// ============================================================================
// POST /api/moderation/hide-post
// Hide a post (set moderation_status to 'hidden')
// ============================================================================

app.post('/hide-post', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();
    const { postUri, reason } = body;

    if (!postUri) {
      return c.json({ error: 'InvalidRequest', message: 'postUri is required' }, 400);
    }

    // Get feedId from post_index
    const feedResult = await c.env.DB.prepare(
      `SELECT p.feed_id, f.community_id
       FROM post_index p
       INNER JOIN theme_feeds f ON p.feed_id = f.id
       WHERE p.uri = ?`
    )
      .bind(postUri)
      .first<{ feed_id: string; community_id: string }>();

    if (!feedResult) {
      return c.json({ error: 'NotFound', message: 'Post not found in index' }, 404);
    }

    // Check moderator role
    const roleCheck = await checkModeratorRole(c, feedResult.community_id);
    if (!roleCheck.isModerator) {
      return roleCheck.error;
    }

    // Hide the post
    const moderationService = new ModerationService(c.env);
    const result = await moderationService.hidePost(
      postUri,
      userDid,
      feedResult.feed_id,
      reason
    );

    return c.json(result, 200);
  } catch (err) {
    console.error('[POST /api/moderation/hide-post] Error:', err);
    return c.json(
      { error: 'InternalServerError', message: (err as Error).message },
      500
    );
  }
});

// ============================================================================
// POST /api/moderation/unhide-post
// Unhide a post (set moderation_status to 'approved')
// ============================================================================

app.post('/unhide-post', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();
    const { postUri } = body;

    if (!postUri) {
      return c.json({ error: 'InvalidRequest', message: 'postUri is required' }, 400);
    }

    // Get feedId and communityId from post_index
    const feedResult = await c.env.DB.prepare(
      `SELECT p.feed_id, f.community_id
       FROM post_index p
       INNER JOIN theme_feeds f ON p.feed_id = f.id
       WHERE p.uri = ?`
    )
      .bind(postUri)
      .first<{ feed_id: string; community_id: string }>();

    if (!feedResult) {
      return c.json({ error: 'NotFound', message: 'Post not found in index' }, 404);
    }

    // Check moderator role
    const roleCheck = await checkModeratorRole(c, feedResult.community_id);
    if (!roleCheck.isModerator) {
      return roleCheck.error;
    }

    // Unhide the post
    const moderationService = new ModerationService(c.env);
    const result = await moderationService.unhidePost(postUri, userDid, feedResult.feed_id);

    return c.json(result, 200);
  } catch (err) {
    console.error('[POST /api/moderation/unhide-post] Error:', err);
    return c.json(
      { error: 'InternalServerError', message: (err as Error).message },
      500
    );
  }
});

// ============================================================================
// POST /api/moderation/block-user
// Block a user from a feed or community
// ============================================================================

app.post('/block-user', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();
    const { userDidToBlock, feedId, reason } = body;

    if (!userDidToBlock || !feedId) {
      return c.json(
        { error: 'InvalidRequest', message: 'userDid and feedId are required' },
        400
      );
    }

    // Get communityId from feedId
    const feedResult = await c.env.DB.prepare(
      `SELECT community_id FROM theme_feeds WHERE id = ?`
    )
      .bind(feedId)
      .first<{ community_id: string }>();

    if (!feedResult) {
      return c.json({ error: 'NotFound', message: 'Feed not found' }, 404);
    }

    // Check moderator role
    const roleCheck = await checkModeratorRole(c, feedResult.community_id);
    if (!roleCheck.isModerator) {
      return roleCheck.error;
    }

    // Block the user
    const moderationService = new ModerationService(c.env);
    const result = await moderationService.blockUser(feedId, userDidToBlock, userDid, reason);

    return c.json(result, 200);
  } catch (err) {
    console.error('[POST /api/moderation/block-user] Error:', err);
    return c.json(
      { error: 'InternalServerError', message: (err as Error).message },
      500
    );
  }
});

// ============================================================================
// POST /api/moderation/unblock-user
// Unblock a user from a feed
// ============================================================================

app.post('/unblock-user', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();
    const { userDidToUnblock, feedId } = body;

    if (!userDidToUnblock || !feedId) {
      return c.json(
        { error: 'InvalidRequest', message: 'userDid and feedId are required' },
        400
      );
    }

    // Get communityId from feedId
    const feedResult = await c.env.DB.prepare(
      `SELECT community_id FROM theme_feeds WHERE id = ?`
    )
      .bind(feedId)
      .first<{ community_id: string }>();

    if (!feedResult) {
      return c.json({ error: 'NotFound', message: 'Feed not found' }, 404);
    }

    // Check moderator role
    const roleCheck = await checkModeratorRole(c, feedResult.community_id);
    if (!roleCheck.isModerator) {
      return roleCheck.error;
    }

    // Unblock the user
    const moderationService = new ModerationService(c.env);
    const result = await moderationService.unblockUser(feedId, userDidToUnblock, userDid);

    return c.json(result, 200);
  } catch (err) {
    console.error('[POST /api/moderation/unblock-user] Error:', err);
    return c.json(
      { error: 'InternalServerError', message: (err as Error).message },
      500
    );
  }
});

// ============================================================================
// GET /api/moderation/logs
// Get moderation logs for a feed or community
// ============================================================================

app.get('/logs', async (c) => {
  try {
    const feedId = c.req.query('feedId');
    const communityId = c.req.query('communityId');
    const cursor = c.req.query('cursor');
    const limit = parseInt(c.req.query('limit') || '50', 10);

    if (!feedId && !communityId) {
      return c.json(
        { error: 'InvalidRequest', message: 'feedId or communityId is required' },
        400
      );
    }

    // Get communityId if feedId provided
    let targetCommunityId = communityId;
    if (feedId) {
      const feedResult = await c.env.DB.prepare(
        `SELECT community_id FROM theme_feeds WHERE id = ?`
      )
        .bind(feedId)
        .first<{ community_id: string }>();

      if (!feedResult) {
        return c.json({ error: 'NotFound', message: 'Feed not found' }, 404);
      }
      targetCommunityId = feedResult.community_id;
    }

    if (!targetCommunityId) {
      return c.json({ error: 'InvalidRequest', message: 'Invalid feedId or communityId' }, 400);
    }

    // Check moderator role
    const roleCheck = await checkModeratorRole(c, targetCommunityId);
    if (!roleCheck.isModerator) {
      return roleCheck.error;
    }

    // Get logs
    const result = feedId
      ? await ModerationLogModel.getLogsByFeed(c.env.DB, feedId, limit, cursor)
      : await ModerationLogModel.getLogsByCommunity(c.env.DB, targetCommunityId, limit, cursor);

    return c.json(result, 200);
  } catch (err) {
    console.error('[GET /api/moderation/logs] Error:', err);
    return c.json(
      { error: 'InternalServerError', message: (err as Error).message },
      500
    );
  }
});

export default app;
