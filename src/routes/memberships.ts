// Atrarium MVP - Memberships Routes
// Membership management API

import { Hono } from 'hono';
import type { Env } from '../types';
import { AuthService } from '../services/auth';
import { MembershipModel } from '../models/membership';
import { CommunityModel } from '../models/community';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// Middleware: JWT Authentication
// ============================================================================

app.use('*', async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
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
// Join community
// ============================================================================

app.post('/:communityId/members', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');

    // Check if community exists
    const communityModel = new CommunityModel(c.env);
    const community = await communityModel.getById(communityId);

    if (!community) {
      return c.json({ error: 'NotFound', message: 'Community not found' }, 404);
    }

    // Check if user is already a member
    const membershipModel = new MembershipModel(c.env);
    const existing = await membershipModel.getByUserAndCommunity(communityId, userDid);

    if (existing) {
      return c.json({ error: 'Conflict', message: 'Already a member' }, 409);
    }

    // Create membership
    const membership = await membershipModel.create(communityId, userDid, 'member');

    // Increment community member count
    await communityModel.incrementMemberCount(communityId);

    return c.json(
      {
        communityId: membership.communityId,
        userDid: membership.userDid,
        role: membership.role,
        joinedAt: membership.joinedAt,
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
// Leave community
// ============================================================================

app.delete('/:communityId/members/me', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');

    const membershipModel = new MembershipModel(c.env);

    // Delete membership (will throw if user is owner)
    await membershipModel.delete(communityId, userDid);

    // Decrement community member count
    const communityModel = new CommunityModel(c.env);
    await communityModel.decrementMemberCount(communityId);

    return c.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/communities/:communityId/members/me] Error:', err);

    if ((err as Error).message?.includes('Owner cannot leave')) {
      return c.json(
        { error: 'Forbidden', message: 'Owner cannot leave. Transfer ownership first.' },
        403
      );
    }

    return c.json({ error: 'InternalServerError', message: 'Failed to leave community' }, 500);
  }
});

export default app;
