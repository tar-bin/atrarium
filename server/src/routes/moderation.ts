import { Hono } from 'hono';
import { AuthService } from '../services/auth';
import type { Env, HonoVariables } from '../types';
import { MODERATION_REASONS, type ModerationReason } from '../types';

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
  } catch (_err) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or missing JWT' }, 401);
  }
});

// Helper removed - moderation role check now in Durable Object

// ============================================================================
// Helper: Validate moderation reason (007-reason-enum-atproto)
// Enum-based validation (eliminates PII/confidential data risk)
// ============================================================================

function validateModerationReason(reason?: string): { valid: boolean; error?: string } {
  if (!reason || reason.trim() === '') {
    return { valid: true }; // Optional field
  }

  if (!MODERATION_REASONS.includes(reason as ModerationReason)) {
    return {
      valid: false,
      error: `Invalid reason. Must be one of: ${MODERATION_REASONS.join(', ')}`,
    };
  }

  return { valid: true };
}

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
      return c.json(
        { error: 'InvalidRequest', message: 'postUri and communityId are required' },
        400
      );
    }

    // Validate moderation reason (prevent PII/confidential data in public records)
    const validation = validateModerationReason(reason);
    if (!validation.valid) {
      return c.json({ error: 'InvalidReason', message: validation.error }, 400);
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
      $type: 'net.atrarium.moderation.action',
      action: 'hide_post',
      target: {
        uri: postUri,
        cid: '', // CID not required for hide action
      },
      community: `at://did:plc:system/net.atrarium.community.config/${communityId}`,
      reason: reason || '',
      createdAt: now,
    });

    // Apply moderation to Durable Object
    await stub.fetch(
      new Request('http://fake-host/moderatePost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hide_post',
          targetUri: postUri,
          reason,
          createdAt: now,
        }),
      })
    );

    return c.json({ success: true }, 200);
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// POST /api/moderation/unhide-post
// Unhide a post (PDS-first architecture)
// ============================================================================

app.post('/unhide-post', async (c) => {
  try {
    const body = await c.req.json();
    const { postUri, communityId, reason } = body;

    if (!postUri || !communityId) {
      return c.json(
        { error: 'InvalidRequest', message: 'postUri and communityId are required' },
        400
      );
    }

    // Validate moderation reason (enum-only, 007-reason-enum-atproto)
    const validation = validateModerationReason(reason);
    if (!validation.valid) {
      return c.json({ error: 'InvalidReason', message: validation.error }, 400);
    }

    // TODO: Similar to hide-post (create PDS record + update Durable Object)
    return c.json(
      { error: 'NotImplemented', message: 'PDS-based unhide not yet implemented' },
      501
    );
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// POST /api/moderation/block-user
// Block a user from a feed or community
// ============================================================================

app.post('/block-user', async (c) => {
  try {
    const body = await c.req.json();
    const { userDid, communityId, reason } = body;

    if (!userDid || !communityId) {
      return c.json(
        { error: 'InvalidRequest', message: 'userDid and communityId are required' },
        400
      );
    }

    // Validate moderation reason (prevent PII/confidential data in public records)
    const validation = validateModerationReason(reason);
    if (!validation.valid) {
      return c.json({ error: 'InvalidReason', message: validation.error }, 400);
    }

    // TODO: Implement PDS-based user blocking
    return c.json({ error: 'NotImplemented', message: 'PDS-based block not yet implemented' }, 501);
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// POST /api/moderation/unblock-user
// Unblock a user from a feed (PDS-first architecture)
// ============================================================================

app.post('/unblock-user', async (c) => {
  try {
    const body = await c.req.json();
    const { userDid, communityId, reason } = body;

    if (!userDid || !communityId) {
      return c.json(
        { error: 'InvalidRequest', message: 'userDid and communityId are required' },
        400
      );
    }

    // Validate moderation reason (enum-only, 007-reason-enum-atproto)
    const validation = validateModerationReason(reason);
    if (!validation.valid) {
      return c.json({ error: 'InvalidReason', message: validation.error }, 400);
    }

    // TODO: Implement PDS-based user unblocking
    return c.json(
      { error: 'NotImplemented', message: 'PDS-based unblock not yet implemented' },
      501
    );
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
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
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

export default app;
