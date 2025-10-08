// Atrarium MVP - Moderation Routes
// Moderation API (T039-T043)

import { Hono } from 'hono';
import { ATProtoService } from '../services/atproto';
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
// Helper: Check if user is admin (owner or moderator)
// ============================================================================

async function checkAdminPermission(
  atproto: ATProtoService,
  userDid: string,
  communityUri: string
): Promise<{ isAdmin: boolean; role?: string; error?: string }> {
  try {
    const memberships = await atproto.listMemberships(userDid, {
      communityUri,
      activeOnly: true,
    });

    if (memberships.length === 0) {
      return { isAdmin: false, error: 'User is not a member' };
    }

    const role = memberships[0]?.role;
    if (role !== 'owner' && role !== 'moderator') {
      return { isAdmin: false, error: 'Admin access required' };
    }

    return { isAdmin: true, role };
  } catch (err) {
    return { isAdmin: false, error: (err as Error).message };
  }
}

// ============================================================================
// POST /api/moderation/hide
// Hide a post (T039 - admin only)
// ============================================================================

app.post('/hide', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
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

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.community.config/${communityId}`;

    // Check admin permission
    const permissionCheck = await checkAdminPermission(atproto, userDid, communityUri);
    if (!permissionCheck.isAdmin) {
      return c.json({ error: 'Forbidden', message: permissionCheck.error }, 403);
    }

    const now = new Date().toISOString();

    // Create ModerationAction in PDS
    await atproto.createModerationAction(
      {
        $type: 'net.atrarium.moderation.action',
        action: 'hide_post',
        target: {
          uri: postUri,
          cid: '', // CID not required for hide action
        },
        community: communityUri,
        reason: reason || '',
        createdAt: now,
      },
      userDid
    );

    // Apply moderation to Durable Object
    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

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

    return c.json({
      success: true,
      message: 'Post hidden successfully',
      postUri,
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// POST /api/moderation/unhide
// Unhide a post (T040 - admin only)
// ============================================================================

app.post('/unhide', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();
    const { postUri, communityId, reason } = body;

    if (!postUri || !communityId) {
      return c.json(
        { error: 'InvalidRequest', message: 'postUri and communityId are required' },
        400
      );
    }

    // Validate moderation reason (enum-only)
    const validation = validateModerationReason(reason);
    if (!validation.valid) {
      return c.json({ error: 'InvalidReason', message: validation.error }, 400);
    }

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.community.config/${communityId}`;

    // Check admin permission
    const permissionCheck = await checkAdminPermission(atproto, userDid, communityUri);
    if (!permissionCheck.isAdmin) {
      return c.json({ error: 'Forbidden', message: permissionCheck.error }, 403);
    }

    const now = new Date().toISOString();

    // Create ModerationAction in PDS
    await atproto.createModerationAction(
      {
        $type: 'net.atrarium.moderation.action',
        action: 'unhide_post',
        target: {
          uri: postUri,
          cid: '',
        },
        community: communityUri,
        reason: reason || '',
        createdAt: now,
      },
      userDid
    );

    // Apply moderation to Durable Object
    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    await stub.fetch(
      new Request('http://fake-host/moderatePost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unhide_post',
          targetUri: postUri,
          reason,
          createdAt: now,
        }),
      })
    );

    return c.json({
      success: true,
      message: 'Post unhidden successfully',
      postUri,
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// POST /api/moderation/block
// Block a user in community (T041 - admin only)
// ============================================================================

app.post('/block', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();
    const { targetDid, communityId, reason } = body;

    if (!targetDid || !communityId) {
      return c.json(
        { error: 'InvalidRequest', message: 'targetDid and communityId are required' },
        400
      );
    }

    // Validate moderation reason
    const validation = validateModerationReason(reason);
    if (!validation.valid) {
      return c.json({ error: 'InvalidReason', message: validation.error }, 400);
    }

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.community.config/${communityId}`;

    // Check admin permission
    const permissionCheck = await checkAdminPermission(atproto, userDid, communityUri);
    if (!permissionCheck.isAdmin) {
      return c.json({ error: 'Forbidden', message: permissionCheck.error }, 403);
    }

    const now = new Date().toISOString();

    // Create ModerationAction in PDS
    await atproto.createModerationAction(
      {
        $type: 'net.atrarium.moderation.action',
        action: 'block_user',
        target: {
          did: targetDid,
        },
        community: communityUri,
        reason: reason || '',
        createdAt: now,
      },
      userDid
    );

    // Apply block to Durable Object
    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    await stub.fetch(
      new Request('http://fake-host/blockUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDid,
          reason,
          createdAt: now,
        }),
      })
    );

    return c.json({
      success: true,
      message: 'User blocked successfully',
      targetDid,
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// POST /api/moderation/unblock
// Unblock a user in community (T042 - admin only)
// ============================================================================

app.post('/unblock', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();
    const { targetDid, communityId, reason } = body;

    if (!targetDid || !communityId) {
      return c.json(
        { error: 'InvalidRequest', message: 'targetDid and communityId are required' },
        400
      );
    }

    // Validate moderation reason (enum-only)
    const validation = validateModerationReason(reason);
    if (!validation.valid) {
      return c.json({ error: 'InvalidReason', message: validation.error }, 400);
    }

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.community.config/${communityId}`;

    // Check admin permission
    const permissionCheck = await checkAdminPermission(atproto, userDid, communityUri);
    if (!permissionCheck.isAdmin) {
      return c.json({ error: 'Forbidden', message: permissionCheck.error }, 403);
    }

    const now = new Date().toISOString();

    // Create ModerationAction in PDS
    await atproto.createModerationAction(
      {
        $type: 'net.atrarium.moderation.action',
        action: 'unblock_user',
        target: {
          did: targetDid,
        },
        community: communityUri,
        reason: reason || '',
        createdAt: now,
      },
      userDid
    );

    // Apply unblock to Durable Object
    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    await stub.fetch(
      new Request('http://fake-host/unblockUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDid,
          reason,
          createdAt: now,
        }),
      })
    );

    return c.json({
      success: true,
      message: 'User unblocked successfully',
      targetDid,
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// GET /api/moderation/:communityId/history
// Get moderation history (T043 - admin only)
// ============================================================================

app.get('/:communityId/history', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');

    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.community.config/${communityId}`;

    // Check admin permission
    const permissionCheck = await checkAdminPermission(atproto, userDid, communityUri);
    if (!permissionCheck.isAdmin) {
      return c.json({ error: 'Forbidden', message: permissionCheck.error }, 403);
    }

    // List moderation actions from PDS
    const actions = await atproto.listModerationActions(communityUri, userDid);

    return c.json({
      actions: actions.map((a) => ({
        uri: a.uri,
        action: a.action,
        target: a.target,
        community: a.community,
        reason: a.reason,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

export default app;
