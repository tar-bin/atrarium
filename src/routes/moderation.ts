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
// Helper: Validate moderation reason
// Ensures reason does not contain sensitive information (PII, confidential data)
// ============================================================================

function validateModerationReason(reason?: string): { valid: boolean; error?: string } {
  if (!reason || reason.trim() === '') {
    return { valid: true }; // Empty reason is allowed
  }

  const trimmedReason = reason.trim();

  // Check length (max 300 characters for safety)
  if (trimmedReason.length > 300) {
    return { valid: false, error: 'Reason too long (max 300 characters)' };
  }

  // Check for potential PII patterns
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  // Phone pattern: at least 10 digits with optional separators (avoid false positives like "#123")
  const phonePattern = /(\+?\d{1,4}[-.\s()]?)?\d{3,4}[-.\s()]?\d{3,4}[-.\s]?\d{4,}/;
  const urlPattern = /https?:\/\/[^\s]+/;

  if (emailPattern.test(trimmedReason)) {
    return { valid: false, error: 'Reason contains email address (not allowed in public records)' };
  }

  if (phonePattern.test(trimmedReason)) {
    return { valid: false, error: 'Reason may contain phone number (not allowed in public records)' };
  }

  // Warning for URLs (not strict prohibition, but suspicious)
  if (urlPattern.test(trimmedReason)) {
    return { valid: false, error: 'Reason contains URL (avoid including external links in public records)' };
  }

  // Warning keywords that suggest confidential information
  const sensitiveKeywords = [
    'report',
    'complaint',
    'ticket',
    'internal',
    'private',
    'confidential',
    'password',
    'secret',
  ];

  const lowerReason = trimmedReason.toLowerCase();
  for (const keyword of sensitiveKeywords) {
    if (lowerReason.includes(keyword)) {
      return {
        valid: false,
        error: `Reason contains potentially sensitive keyword "${keyword}". Use brief, professional descriptions (e.g., "Spam post", "Community guidelines violation").`,
      };
    }
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
      return c.json({ error: 'InvalidRequest', message: 'postUri and communityId are required' }, 400);
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
    const body = await c.req.json();
    const { userDid, communityId, reason } = body;

    if (!userDid || !communityId) {
      return c.json({ error: 'InvalidRequest', message: 'userDid and communityId are required' }, 400);
    }

    // Validate moderation reason (prevent PII/confidential data in public records)
    const validation = validateModerationReason(reason);
    if (!validation.valid) {
      return c.json({ error: 'InvalidReason', message: validation.error }, 400);
    }

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
