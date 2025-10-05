// Atrarium MVP - Posts Routes
// Post submission API with hashtag appending

import { Hono } from 'hono';
import type { Env, HonoVariables } from '../types';
import { AuthService } from '../services/auth';
import { ThemeFeedModel } from '../models/theme-feed';
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
// POST /api/posts
// Create post with automatic hashtag appending
// ============================================================================

app.post('/', async (c) => {
  try {
    const userDid = c.get('userDid') as string;
    const body = await c.req.json();
    const { feedId, text } = body;

    // Validate input
    if (!feedId || !text) {
      return c.json(
        { error: 'Invalid input', code: 'INVALID_INPUT', message: 'feedId and text are required' },
        400
      );
    }

    if (text.length > 300) {
      return c.json(
        { error: 'Text exceeds 300 characters', code: 'INVALID_INPUT' },
        400
      );
    }

    // Verify theme feed exists
    const themeFeedModel = new ThemeFeedModel(c.env);
    const feed = await themeFeedModel.getById(feedId);

    if (!feed) {
      return c.json(
        { error: 'Feed not found', code: 'FEED_NOT_FOUND' },
        404
      );
    }

    // Verify user is a member of the community
    const membershipModel = new MembershipModel(c.env);
    const membership = await membershipModel.getByUserAndCommunity(feed.communityId, userDid);

    if (!membership) {
      return c.json(
        { error: 'User is not a member of this community', code: 'NOT_A_MEMBER' },
        403
      );
    }

    // Rate limiting: 10 posts/min per user
    const rateLimitKey = `rate_limit:posts:${userDid}`;
    const currentCount = await c.env.POST_CACHE.get(rateLimitKey);

    if (currentCount && parseInt(currentCount, 10) >= 10) {
      return c.json(
        { error: 'Rate limit exceeded: maximum 10 posts per minute', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        { 'Retry-After': '60' }
      );
    }

    // Increment rate limit counter
    const newCount = currentCount ? parseInt(currentCount, 10) + 1 : 1;
    await c.env.POST_CACHE.put(rateLimitKey, newCount.toString(), { expirationTtl: 60 });

    // Append feed hashtag to text
    const finalText = `${text} ${feed.hashtag}`;

    // TODO: Create post in user's PDS via @atproto/api
    // For now, generate a mock AT-URI
    const postId = crypto.randomUUID().replace(/-/g, '').substring(0, 13);
    const postUri = `at://${userDid}/app.bsky.feed.post/${postId}`;

    return c.json(
      {
        postUri,
        hashtags: [feed.hashtag],
        finalText,
      },
      201
    );
  } catch (err) {
    console.error('[POST /api/posts] Error:', err);
    return c.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', message: (err as Error).message },
      500
    );
  }
});

export default app;
