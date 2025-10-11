// Atrarium Post API Routes (014-bluesky: Custom Lexicon Posts)
// Handles creation and retrieval of net.atrarium.group.post records

import { Hono } from 'hono';
import { ATProtoService } from '../services/atproto';
import { authMiddleware } from '../services/auth';
import type { Env } from '../types';

const posts = new Hono<{ Bindings: Env; Variables: { userDid: string } }>();

// Apply authentication middleware to all routes
posts.use('/*', authMiddleware);

// ============================================================================
// POST /api/communities/:communityId/posts
// Create a new post in a community
// ============================================================================

posts.post('/communities/:communityId/posts', async (c) => {
  const communityId = c.req.param('communityId');
  const userDid = c.get('userDid');

  // Validate communityId format (8-char hex)
  if (!/^[0-9a-f]{8}$/.test(communityId)) {
    return c.json({ error: 'Invalid community ID format (must be 8-char hex)' }, 400);
  }

  // Parse request body
  const body = await c.req.json();
  const { text } = body;

  if (!text || typeof text !== 'string') {
    return c.json({ error: 'Missing or invalid "text" field' }, 400);
  }

  if (text.length === 0) {
    return c.json({ error: 'Post text must not be empty' }, 400);
  }

  if (text.length > 300) {
    return c.json({ error: 'Post text must not exceed 300 characters' }, 400);
  }

  try {
    // Verify user is a member of the community (query Durable Object)
    const feedId = c.env.COMMUNITY_FEED.idFromName(communityId);
    const feedStub = c.env.COMMUNITY_FEED.get(feedId);

    try {
      const membershipResponse = await feedStub.fetch(
        new Request(`https://internal/checkMembership?did=${userDid}`)
      );

      if (!membershipResponse.ok) {
        return c.json({ error: 'You are not a member of this community' }, 403);
      }

      const membershipData = (await membershipResponse.json()) as { isMember: boolean };
      if (!membershipData.isMember) {
        return c.json({ error: 'You are not a member of this community' }, 403);
      }
    } catch (_error) {
      return c.json({ error: 'Failed to verify membership' }, 500);
    }

    // Create post record in user's PDS
    const atprotoService = new ATProtoService(c.env);
    const postRecord = {
      $type: 'net.atrarium.group.post',
      text,
      communityId,
      createdAt: new Date().toISOString(),
    };

    const result = await atprotoService.createCommunityPost(postRecord, userDid);

    // Return creation result
    return c.json(
      {
        uri: result.uri,
        rkey: result.rkey,
        createdAt: postRecord.createdAt,
      },
      201
    );
  } catch (error) {
    return c.json(
      {
        error: 'Failed to create post',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// ============================================================================
// GET /api/communities/:communityId/posts
// Get posts for a community timeline
// ============================================================================

posts.get('/communities/:communityId/posts', async (c) => {
  const communityId = c.req.param('communityId');

  // Validate communityId format (8-char hex)
  if (!/^[0-9a-f]{8}$/.test(communityId)) {
    return c.json({ error: 'Invalid community ID format (must be 8-char hex)' }, 400);
  }

  // Parse query parameters
  const limit = Math.min(Number(c.req.query('limit')) || 50, 100);
  const cursor = c.req.query('cursor');

  try {
    // Get CommunityFeedGenerator Durable Object instance
    const feedId = c.env.COMMUNITY_FEED.idFromName(communityId);
    const feedStub = c.env.COMMUNITY_FEED.get(feedId);

    // Fetch posts from Durable Object
    const response = await feedStub.fetch(
      new Request(`https://internal/posts?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`)
    );

    if (!response.ok) {
      const error = await response.text();
      return c.json({ error: `Failed to fetch posts: ${error}` }, 500);
    }

    const data = (await response.json()) as {
      posts: Array<{ authorDid: string; [key: string]: unknown }>;
      cursor: string | null;
    };

    // Enrich posts with author profiles
    const atprotoService = new ATProtoService(c.env);
    const authorDids = [...new Set(data.posts.map((post) => post.authorDid))];

    if (authorDids.length > 0) {
      try {
        const profiles = await atprotoService.getProfiles(authorDids);
        const profileMap = new Map(profiles.map((p) => [p.did, p]));

        // Attach author profile to each post
        const enrichedPosts = data.posts.map((post) => ({
          ...post,
          author: profileMap.get(post.authorDid) || {
            did: post.authorDid,
            handle: 'unknown.bsky.social',
            displayName: null,
            avatar: null,
          },
        }));

        return c.json({ posts: enrichedPosts, cursor: data.cursor });
      } catch (_error) {
        // Return posts without enrichment if profile fetch fails
        return c.json(data);
      }
    }

    return c.json(data);
  } catch (error) {
    return c.json(
      {
        error: 'Failed to fetch posts',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// ============================================================================
// GET /api/posts/:uri
// Get a single post by AT-URI
// ============================================================================

posts.get('/posts/:uri', async (c) => {
  const encodedUri = c.req.param('uri');
  const uri = decodeURIComponent(encodedUri);

  // Validate AT-URI format
  if (
    !/^at:\/\/did:(plc|web):[a-zA-Z0-9._-]+\/net\.atrarium\.group\.post\/[a-zA-Z0-9]+$/.test(uri)
  ) {
    return c.json({ error: 'Invalid AT-URI format (must be net.atrarium.group.post)' }, 400);
  }

  try {
    // Parse URI to extract communityId (requires fetching the record)
    // const atprotoService = new ATProtoService(c.env);

    // Extract repo, collection, rkey from URI
    const uriParts = uri.replace('at://', '').split('/');
    const repo = uriParts[0];
    const collection = uriParts[1];
    const rkey = uriParts[2];

    if (!repo || !collection || !rkey) {
      return c.json({ error: 'Invalid AT-URI format' }, 400);
    }

    // Fetch post from PDS
    const atprotoService = new ATProtoService(c.env);
    const agent = await atprotoService.getAgent();

    try {
      const recordResponse = await agent.com.atproto.repo.getRecord({
        repo,
        collection,
        rkey,
      });

      const record = recordResponse.data.value as {
        $type: string;
        text: string;
        communityId: string;
        createdAt: string;
      };

      // Validate that it's a community post
      if (record.$type !== 'net.atrarium.group.post') {
        return c.json({ error: 'Record is not a community post' }, 400);
      }

      // Fetch author profile
      const profile = await atprotoService.getProfile(repo);

      return c.json({
        uri,
        rkey,
        text: record.text,
        communityId: record.communityId,
        createdAt: record.createdAt,
        author: profile,
      });
    } catch (error) {
      return c.json(
        {
          error: 'Post not found',
          details: error instanceof Error ? error.message : String(error),
        },
        404
      );
    }
  } catch (error) {
    return c.json(
      {
        error: 'Failed to fetch post',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default posts;
