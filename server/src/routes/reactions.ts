// Atrarium API - Reactions Routes (016-slack-mastodon-misskey, T019)
// POST /api/reactions/add, DELETE /api/reactions/remove, GET /api/reactions/list

import { Hono } from 'hono';
import type { EmojiReference } from '../schemas/lexicon';
import {
  AddReactionRequestSchema,
  ListReactionsRequestSchema,
  RemoveReactionRequestSchema,
} from '../schemas/validation';
import { ATProtoService } from '../services/atproto';
import { authMiddleware } from '../services/auth';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { userDid: string } }>();

// ============================================================================
// POST /api/reactions/add - Add reaction to post
// ============================================================================

app.post('/add', authMiddleware, async (c) => {
  const userDid = c.get('userDid');
  const body = await c.req.json();

  // Validate request
  const validation = AddReactionRequestSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: validation.error.issues.map((i) => i.message).join(', ') }, 400);
  }

  const { postUri, emoji } = validation.data;

  // Extract communityId from postUri
  // Format: at://did:plc:xxx/net.atrarium.group.post/rkey
  // Community ID is embedded in the post record (not in URI)
  // For now, we require client to send communityId separately
  // TODO: Fetch post record from PDS to get communityId
  const communityId = body.communityId || '00000000'; // Placeholder

  try {
    // Get Durable Object for this community
    const doId = c.env.COMMUNITY_FEED.idFromName(communityId);
    const doStub = c.env.COMMUNITY_FEED.get(doId);

    // Check rate limit (100 reactions/hour/user)
    const doResponse = await doStub.fetch('http://do/checkRateLimit', {
      method: 'POST',
      body: JSON.stringify({ userId: userDid }),
    });
    const rateLimitResult = (await doResponse.json()) as { allowed: boolean; retryAfter?: number };

    if (!rateLimitResult.allowed) {
      return c.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'You have exceeded the reaction rate limit (100 reactions per hour)',
          retryAfter: rateLimitResult.retryAfter,
        },
        429,
        {
          'Retry-After': String(rateLimitResult.retryAfter || 3600),
        }
      );
    }

    const atproto = new ATProtoService(c.env);

    // Create reaction record in PDS
    const result = await atproto.createReaction(postUri, emoji as EmojiReference, communityId);

    // Update Durable Object aggregate

    await doStub.fetch('http://do/updateReaction', {
      method: 'POST',
      body: JSON.stringify({
        postUri,
        emoji,
        reactorDid: userDid,
        operation: 'add',
        reactionUri: result.uri,
      }),
    });

    return c.json({ success: true, reactionUri: result.uri });
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: Intentional error log
    console.error('Error adding reaction:', error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// ============================================================================
// DELETE /api/reactions/remove - Remove reaction from post
// ============================================================================

app.delete('/remove', authMiddleware, async (c) => {
  const userDid = c.get('userDid');
  const body = await c.req.json();

  // Validate request
  const validation = RemoveReactionRequestSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: validation.error.issues.map((i) => i.message).join(', ') }, 400);
  }

  const { reactionUri } = validation.data;

  // Parse reactionUri to get DID (must be current user's)
  const parts = reactionUri.split('/');
  const did = parts[2]; // at://did:plc:xxx/...

  if (did !== userDid) {
    return c.json({ error: 'Cannot remove reaction owned by another user' }, 403);
  }

  try {
    const atproto = new ATProtoService(c.env);

    // Delete reaction record from PDS
    await atproto.deleteReaction(reactionUri);

    // TODO: Update Durable Object aggregate
    // We need to fetch the reaction record to get postUri and emoji
    // For now, client should send these as well

    return c.json({ success: true });
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: Intentional error log
    console.error('Error removing reaction:', error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// ============================================================================
// GET /api/reactions/list - List reactions for a post
// ============================================================================

app.get('/list', async (c) => {
  const query = c.req.query();

  // Validate request
  const validation = ListReactionsRequestSchema.safeParse({
    postUri: query.postUri,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
    cursor: query.cursor,
  });

  if (!validation.success) {
    return c.json({ error: validation.error.issues.map((i) => i.message).join(', ') }, 400);
  }

  const { postUri, cursor } = validation.data;

  // Extract communityId from postUri (placeholder for now)
  // TODO: Implement proper post URI parsing
  const communityId = '00000000'; // Placeholder

  try {
    // Fetch reaction aggregates from Durable Object
    const doId = c.env.COMMUNITY_FEED.idFromName(communityId);
    const doStub = c.env.COMMUNITY_FEED.get(doId);

    const currentUserDid = c.get('userDid') || undefined;

    const response = await doStub.fetch('http://do/getReactions', {
      method: 'POST',
      body: JSON.stringify({
        postUri,
        currentUserDid,
      }),
    });

    const data = await response.json<{
      reactions: Array<{
        emoji: EmojiReference;
        count: number;
        reactors: string[];
        currentUserReacted: boolean;
      }>;
    }>();

    return c.json({
      reactions: data.reactions,
      cursor: cursor || undefined, // Pagination not implemented yet
    });
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: Intentional error log
    console.error('Error listing reactions:', error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// ============================================================================
// GET /api/communities/:communityId/reactions/stream - SSE endpoint (T043)
// ============================================================================

app.get('/stream/:communityId', async (c) => {
  const communityId = c.req.param('communityId');

  if (!communityId) {
    return c.json({ error: 'Missing communityId parameter' }, 400);
  }

  try {
    // Get Durable Object stub
    const doId = c.env.COMMUNITY_FEED.idFromName(communityId);
    const doStub = c.env.COMMUNITY_FEED.get(doId);

    // Proxy SSE connection to Durable Object
    // The DO will manage connection state and broadcasting
    const doRequest = new Request('http://do/reactions/stream', {
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });

    const doResponse = await doStub.fetch(doRequest);

    // Pass through SSE response from Durable Object
    return new Response(doResponse.body, {
      status: doResponse.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*', // CORS for SSE
      },
    });
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: Intentional error log
    console.error('Error setting up SSE stream:', error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

export default app;
