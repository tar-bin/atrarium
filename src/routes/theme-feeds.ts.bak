// Atrarium MVP - Theme Feeds Routes
// Theme feed management API

import { Hono } from 'hono';
import type { Env, ThemeFeedResponse, HonoVariables } from '../types';
import { AuthService } from '../services/auth';
import { ThemeFeedModel } from '../models/theme-feed';
import { MembershipModel } from '../models/membership';
import { validateRequest, CreateThemeFeedSchema } from '../schemas/validation';

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
// GET /api/communities/:communityId/feeds
// List theme feeds for a community
// ============================================================================

app.get('/:communityId/feeds', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');

    // Check if user is a member
    const membershipModel = new MembershipModel(c.env);
    const membership = await membershipModel.getByUserAndCommunity(communityId, userDid);

    if (!membership) {
      return c.json({ error: 'Forbidden', message: 'Not a member of this community' }, 403);
    }

    const themeFeedModel = new ThemeFeedModel(c.env);
    const feeds = await themeFeedModel.listByCommunity(communityId);

    const response = feeds.map((feed): ThemeFeedResponse => ({
      id: feed.id,
      communityId: feed.communityId,
      name: feed.name,
      description: feed.description,
      status: feed.status,
      lastPostAt: feed.lastPostAt,
      posts7d: feed.posts7d,
      activeUsers7d: feed.activeUsers7d,
      createdAt: feed.createdAt,
    }));

    return c.json({ data: response });
  } catch (err) {
    console.error('[GET /api/communities/:communityId/feeds] Error:', err);
    return c.json({ error: 'InternalServerError', message: 'Failed to list theme feeds' }, 500);
  }
});

// ============================================================================
// POST /api/communities/:communityId/feeds
// Create a new theme feed (owner/moderator only)
// ============================================================================

app.post('/:communityId/feeds', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const communityId = c.req.param('communityId');

    // Check if user is owner or moderator
    const membershipModel = new MembershipModel(c.env);
    const isModerator = await membershipModel.hasRole(communityId, userDid, 'moderator');

    if (!isModerator) {
      return c.json(
        { error: 'Forbidden', message: 'Only owner/moderator can create theme feeds' },
        403
      );
    }

    const body = await c.req.json();
    const validation = await validateRequest(CreateThemeFeedSchema, body);

    if (!validation.success) {
      return c.json({ error: 'InvalidRequest', message: validation.error }, 400);
    }

    const themeFeedModel = new ThemeFeedModel(c.env);
    const feed = await themeFeedModel.create(communityId, validation.data);

    const response: ThemeFeedResponse = {
      id: feed.id,
      communityId: feed.communityId,
      name: feed.name,
      description: feed.description,
      status: feed.status,
      lastPostAt: feed.lastPostAt,
      posts7d: feed.posts7d,
      activeUsers7d: feed.activeUsers7d,
      createdAt: feed.createdAt,
    };

    return c.json(response, 201);
  } catch (err) {
    console.error('[POST /api/communities/:communityId/feeds] Error:', err);
    return c.json({ error: 'InternalServerError', message: 'Failed to create theme feed' }, 500);
  }
});

export default app;
