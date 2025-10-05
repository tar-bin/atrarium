import { Hono } from 'hono';
import type { Env, HonoVariables } from '../types';
import { AuthService } from '../services/auth';

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

// Helper removed - moderation role check now in Durable Object

// ============================================================================
// POST /api/moderation/hide-post
// Hide a post (PDS-first architecture)
// ============================================================================

app.post('/hide-post', async (c) => {
  try {
    // const userDid = c.get('userDid') as string;
    const body = await c.req.json();
    const { postUri, communityId, reason } = body;

    if (!postUri || !communityId) {
      return c.json({ error: 'InvalidRequest', message: 'postUri and communityId are required' }, 400);
    }

    // Get Durable Object stub for community
    if (!c.env.COMMUNITY_FEED) {
      throw new Error('COMMUNITY_FEED Durable Object binding not found');
    }

    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    const now = new Date().toISOString();

    // Create ModerationAction in PDS (T035)
    const { ATProtoService } = await import('../services/atproto');
    const atproto = new ATProtoService(c.env);

    await atproto.createModerationAction({
      $type: 'com.atrarium.moderation.action',
      action: 'hide_post',
      target: {
        uri: postUri,
        cid: '', // CID not required for hide action
      },
      community: `at://did:plc:system/com.atrarium.community.config/${communityId}`,
      reason: reason || '',
      createdAt: now,
    });

    // Apply moderation to Durable Object
    await stub.fetch(new Request('http://fake-host/moderatePost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'hide_post',
        targetUri: postUri,
        reason,
        createdAt: now,
      }),
    }));

    return c.json({ success: true }, 200);
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
// Unhide a post (PDS-first architecture)
// ============================================================================

app.post('/unhide-post', async (c) => {
  try {
    const body = await c.req.json();
    const { postUri, communityId } = body;

    if (!postUri || !communityId) {
      return c.json({ error: 'InvalidRequest', message: 'postUri and communityId are required' }, 400);
    }

    // TODO: Similar to hide-post
    return c.json({ error: 'NotImplemented', message: 'PDS-based unhide not yet implemented' }, 501);
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
    // TODO: Implement PDS-based user blocking
    return c.json({ error: 'NotImplemented', message: 'PDS-based block not yet implemented' }, 501);
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
// Unblock a user from a feed (PDS-first architecture)
// ============================================================================

app.post('/unblock-user', async (c) => {
  try {
    // TODO: Implement PDS-based user unblocking
    return c.json({ error: 'NotImplemented', message: 'PDS-based unblock not yet implemented' }, 501);
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
// Get moderation logs for a feed or community (PDS-first architecture)
// ============================================================================

app.get('/logs', async (c) => {
  try {
    // TODO: Implement PDS-based moderation log retrieval
    // - Query PDS for moderation action records
    // - Filter by community/feed
    return c.json({ data: [], cursor: undefined });
  } catch (err) {
    console.error('[GET /api/moderation/logs] Error:', err);
    return c.json(
      { error: 'InternalServerError', message: (err as Error).message },
      500
    );
  }
});

export default app;
