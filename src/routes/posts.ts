// Atrarium MVP - Posts Routes
// Post submission API

import { Hono } from 'hono';
import type { Env, PostIndexResponse } from '../types';
import { AuthService } from '../services/auth';
import { PostIndexModel } from '../models/post-index';
import { ThemeFeedModel } from '../models/theme-feed';
import { MembershipModel } from '../models/membership';
import { CommunityModel } from '../models/community';
import { CacheService } from '../services/cache';
import { validateRequest, SubmitPostSchema } from '../schemas/validation';
import { getCurrentTimestamp } from '../services/db';

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
// POST /api/posts
// Submit post URI to theme feed
// ============================================================================

app.post('/', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();

    const validation = await validateRequest(SubmitPostSchema, body);
    if (!validation.success) {
      return c.json({ error: 'InvalidRequest', message: validation.error }, 400);
    }

    const { uri, feedId } = validation.data;

    // Verify theme feed exists
    const themeFeedModel = new ThemeFeedModel(c.env);
    const feed = await themeFeedModel.getById(feedId);

    if (!feed) {
      return c.json({ error: 'NotFound', message: 'Theme feed not found' }, 404);
    }

    // Verify user is a member of the community
    const membershipModel = new MembershipModel(c.env);
    const membership = await membershipModel.getByUserAndCommunity(feed.communityId, userDid);

    if (!membership) {
      return c.json({ error: 'Forbidden', message: 'Not a member of this community' }, 403);
    }

    // Create post index entry
    const postIndexModel = new PostIndexModel(c.env);
    const post = await postIndexModel.create(validation.data, userDid);

    // Update theme feed last_post_at
    const now = getCurrentTimestamp();
    await themeFeedModel.updateLastPostAt(feedId, now);

    // Increment community post count
    const communityModel = new CommunityModel(c.env);
    await communityModel.incrementPostCount(feed.communityId);

    // Update membership activity
    await membershipModel.updateActivity(feed.communityId, userDid);

    // Cache post metadata
    const cacheService = new CacheService(c.env);
    await cacheService.setPostMetadata(uri, post);

    const response: PostIndexResponse = {
      id: post.id,
      uri: post.uri,
      feedId: post.feedId,
      authorDid: post.authorDid,
      createdAt: post.createdAt,
      hasMedia: post.hasMedia,
      langs: post.langs,
    };

    return c.json(response, 201);
  } catch (err) {
    console.error('[POST /api/posts] Error:', err);

    if ((err as Error).message?.includes('Invalid AT-URI format')) {
      return c.json({ error: 'InvalidRequest', message: (err as Error).message }, 400);
    }

    if ((err as Error).message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Conflict', message: 'Post already indexed' }, 409);
    }

    return c.json({ error: 'InternalServerError', message: 'Failed to submit post' }, 500);
  }
});

export default app;
