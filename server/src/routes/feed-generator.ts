// Atrarium MVP - Feed Generator API Routes
// AT Protocol Feed Generator endpoints (/.well-known/did.json, describeFeedGenerator, getFeedSkeleton, stats)
//
// DEPRECATION NOTICE (014-bluesky):
// This Feed Generator API is being deprecated in favor of Dashboard API-only feeds.
// Reason: Bluesky AppView cannot render custom Lexicon posts (net.atrarium.community.post).
// Timeline: Legacy app.bsky.feed.post indexing will continue during transition period.
// Migration: All timeline fetching should use Dashboard API (/api/communities/{id}/posts).

import { Hono } from 'hono';
import { GetFeedSkeletonParamsSchema, validateRequest } from '../schemas/validation';
import { ATProtoService } from '../services/atproto';
import { AuthService } from '../services/auth';
import type { Env, FeedGeneratorDescription, FeedSkeleton, HonoVariables } from '../types';
import { extractHostname, generateDIDDocument, parseFeedUri } from '../utils/did';

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
  } catch (_err) {
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

    // TODO: Implement PDS-based feed listing
    // - Query PDS for community configs
    // - Filter active communities
    const response: FeedGeneratorDescription = {
      did,
      feeds: [],
    };

    return c.json(response);
  } catch (_err) {
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
// Returns feed skeleton (PDS-first architecture, proxy to Durable Object)
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

    // Parse feed URI to extract community ID
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

    const { feedId: communityId } = parsed;

    // Proxy request to CommunityFeedGenerator Durable Object (T036)
    if (!c.env.COMMUNITY_FEED) {
      throw new Error('COMMUNITY_FEED Durable Object binding not found');
    }

    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    // Call getFeedSkeleton on Durable Object
    const response = await stub.fetch(
      new Request(
        `http://fake-host/getFeedSkeleton?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`
      )
    );

    if (!response.ok) {
      await response.text(); // Consume response body
      return c.json(
        {
          error: 'InternalServerError',
          message: 'Failed to generate feed skeleton',
        },
        500
      );
    }

    const skeleton = (await response.json()) as FeedSkeleton;
    return c.json(skeleton);
  } catch (_err) {
    return c.json(
      {
        error: 'InternalServerError',
        message: 'Failed to generate feed skeleton',
      },
      500
    );
  }
});

// ============================================================================
// GET /api/feeds/:communityId
// Get community feed (T044 - proxy to CommunityFeedGenerator DO)
// ============================================================================

app.get('/api/feeds/:communityId', async (c) => {
  try {
    const communityId = c.req.param('communityId');
    const limit = Number.parseInt(c.req.query('limit') || '20', 10);
    const cursor = c.req.query('cursor');

    // Validate limit (1-100)
    if (limit < 1 || limit > 100) {
      return c.json({ error: 'InvalidRequest', message: 'limit must be between 1 and 100' }, 400);
    }

    // Proxy request to CommunityFeedGenerator Durable Object
    if (!c.env.COMMUNITY_FEED) {
      throw new Error('COMMUNITY_FEED Durable Object binding not found');
    }

    const id = c.env.COMMUNITY_FEED.idFromName(communityId);
    const stub = c.env.COMMUNITY_FEED.get(id);

    // Call getFeedSkeleton on Durable Object
    const response = await stub.fetch(
      new Request(
        `http://fake-host/getFeedSkeleton?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`
      )
    );

    if (!response.ok) {
      await response.text(); // Consume response body
      return c.json(
        {
          error: 'InternalServerError',
          message: 'Failed to generate feed skeleton',
        },
        500
      );
    }

    const skeleton = (await response.json()) as FeedSkeleton;
    return c.json(skeleton);
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

// ============================================================================
// GET /api/feeds/:communityId/stats
// Get community statistics (T045 - memberCount and pendingRequestCount only)
// ============================================================================

app.get('/api/feeds/:communityId/stats', async (c) => {
  try {
    // Auth middleware for stats endpoint
    const authHeader = c.req.header('Authorization') || null;
    if (!authHeader) {
      return c.json({ error: 'Unauthorized', message: 'Authorization header required' }, 401);
    }

    const authService = new AuthService(c.env);
    const userDid = await authService.extractUserFromHeader(authHeader);
    c.set('userDid', userDid);

    const communityId = c.req.param('communityId');
    const atproto = new ATProtoService(c.env);

    const communityUri = `at://did:plc:system/net.atrarium.community.config/${communityId}`;

    // Get community statistics from PDS (T028)
    const stats = await atproto.getCommunityStats(communityUri);

    return c.json({
      communityId,
      memberCount: stats.memberCount,
      pendingRequestCount: stats.pendingRequestCount,
    });
  } catch (err) {
    return c.json({ error: 'InternalServerError', message: (err as Error).message }, 500);
  }
});

export default app;
