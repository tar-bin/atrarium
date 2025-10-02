// Atrarium MVP - Feed Generator API Routes
// AT Protocol Feed Generator endpoints (/.well-known/did.json, describeFeedGenerator, getFeedSkeleton)

import { Hono } from 'hono';
import type { Env, FeedSkeleton, FeedGeneratorDescription, HonoVariables } from '../types';
import { generateDIDDocument, extractHostname, getFeedUri, parseFeedUri } from '../utils/did';
import { PostIndexModel } from '../models/post-index';
import { CacheService } from '../services/cache';
import { validateRequest, GetFeedSkeletonParamsSchema } from '../schemas/validation';

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// ============================================================================
// GET /.well-known/did.json
// Returns DID document identifying this Feed Generator service
// ============================================================================

app.get('/.well-known/did.json', async (c) => {
  try {
    const hostname = extractHostname(c.req.raw);
    const didDoc = generateDIDDocument(hostname);

    return c.json(didDoc, 200, {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Type': 'application/json',
    });
  } catch (err) {
    console.error('[/.well-known/did.json] Error:', err);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to generate DID document',
      },
      500
    );
  }
});

// ============================================================================
// GET /xrpc/app.bsky.feed.describeFeedGenerator
// Returns metadata about available feeds from this generator
// ============================================================================

app.get('/xrpc/app.bsky.feed.describeFeedGenerator', async (c) => {
  try {
    const hostname = extractHostname(c.req.raw);
    const did = `did:web:${hostname.split(':')[0]}`;

    // For Phase 0: List all active feeds across all communities
    // In production: This would be more sophisticated
    const result = await c.env.DB.prepare(
      `SELECT tf.id, tf.name, tf.description, c.name as community_name
      FROM theme_feeds tf
      JOIN communities c ON tf.community_id = c.id
      WHERE tf.archived_at IS NULL AND c.archived_at IS NULL
      ORDER BY tf.last_post_at DESC, tf.created_at DESC
      LIMIT 100`
    ).all();

    const feeds = (result.results || []).map((row: any) => ({
      uri: getFeedUri(did, row.id),
      displayName: `${row.community_name} - ${row.name}`,
      description: row.description || undefined,
    }));

    const response: FeedGeneratorDescription = {
      did,
      feeds,
    };

    return c.json(response);
  } catch (err) {
    console.error('[describeFeedGenerator] Error:', err);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to describe feed generator',
      },
      500
    );
  }
});

// ============================================================================
// GET /xrpc/app.bsky.feed.getFeedSkeleton
// Returns feed skeleton (post URIs only, not full content)
// ============================================================================

app.get('/xrpc/app.bsky.feed.getFeedSkeleton', async (c) => {
  try {
    // Validate query parameters
    const rawParams = {
      feed: c.req.query('feed'),
      limit: c.req.query('limit'),
      cursor: c.req.query('cursor'),
    };

    const validation = await validateRequest(GetFeedSkeletonParamsSchema, rawParams);
    if (!validation.success) {
      return c.json(
        {
          error: 'InvalidRequest',
          message: validation.error,
        },
        400
      );
    }

    const { feed, limit, cursor } = validation.data;

    // Parse feed URI to extract feed ID
    const parsed = parseFeedUri(feed);
    if (!parsed) {
      return c.json(
        {
          error: 'InvalidRequest',
          message: 'Invalid feed URI',
        },
        400
      );
    }

    const { feedId } = parsed;

    // Check cache first
    const cacheService = new CacheService(c.env);
    const cacheKey = `feed:skeleton:${feedId}:${limit}:${cursor || 'start'}`;
    const cached = await cacheService.get<FeedSkeleton>(cacheKey);

    if (cached) {
      return c.json(cached);
    }

    // Query database for post URIs
    const postIndexModel = new PostIndexModel(c.env);
    const { posts, cursor: nextCursor } = await postIndexModel.listByFeed(
      feedId,
      limit,
      cursor
    );

    // Build feed skeleton (URIs only, no content)
    const skeleton: FeedSkeleton = {
      feed: posts.map((post) => ({ post: post.uri })),
      cursor: nextCursor,
    };

    // Cache result for 1 minute
    await cacheService.set(cacheKey, skeleton, 60);

    return c.json(skeleton);
  } catch (err) {
    console.error('[getFeedSkeleton] Error:', err);
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to generate feed skeleton',
      },
      500
    );
  }
});

export default app;
