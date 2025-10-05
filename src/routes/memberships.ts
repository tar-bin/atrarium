// Atrarium MVP - Memberships Routes
// Membership management API

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

// ============================================================================
// POST /api/communities/:communityId/members
// Join community (PDS-first architecture)
// ============================================================================

app.post('/:communityId/members', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');

    // Get Durable Object stub for community
    if (!c.env.COMMUNITY_FEED) {
      throw new Error('COMMUNITY_FEED Durable Object binding not found');
    }

    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    // Check if community exists by trying to get config
    const configResponse = await stub.fetch(new Request('http://fake-host/getFeedSkeleton?limit=1'));
    if (!configResponse.ok && configResponse.status === 404) {
      return c.json({ error: 'NotFound', message: 'Community not found' }, 404);
    }

    const now = new Date().toISOString();

    // Create MembershipRecord in PDS (T034)
    const { ATProtoService } = await import('../services/atproto');
    const atproto = new ATProtoService(c.env);

    await atproto.createMembershipRecord({
      $type: 'com.atrarium.community.membership',
      community: `at://did:plc:system/com.atrarium.community.config/${communityId}`,
      role: 'member',
      joinedAt: now,
      active: true,
    });

    // Add member to Durable Object
    await stub.fetch(new Request('http://fake-host/addMember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        did: userDid,
        role: 'member',
        joinedAt: now,
        active: true,
      }),
    }));

    return c.json(
      {
        communityId,
        userDid,
        role: 'member',
        joinedAt: Math.floor(new Date(now).getTime() / 1000),
      },
      201
    );
  } catch (err) {
    console.error('[POST /api/communities/:communityId/members] Error:', err);
    return c.json({ error: 'InternalServerError', message: 'Failed to join community' }, 500);
  }
});

// ============================================================================
// DELETE /api/communities/:communityId/members/me
// Leave community (PDS-first architecture)
// ============================================================================

app.delete('/:communityId/members/me', async (c) => {
  try {
    // TODO: Implement PDS-based membership deletion
    // - Verify user is not owner
    // - Update membership record in PDS (set active: false)
    // - Remove from Durable Object
    return c.json({ error: 'NotImplemented', message: 'PDS-based leave not yet implemented' }, 501);
  } catch (err) {
    console.error('[DELETE /api/communities/:communityId/members/me] Error:', err);
    return c.json({ error: 'InternalServerError', message: 'Failed to leave community' }, 500);
  }
});

export default app;
