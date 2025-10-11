// Atrarium API - Reactions Routes (016-slack-mastodon-misskey)
// NOTE: This file ONLY contains the SSE stream endpoint.
// All other reaction endpoints (add, remove, list) have been migrated to oRPC.
// SSE endpoint is kept as legacy Hono route because oRPC does not support Server-Sent Events.

import { Hono } from 'hono';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// GET /api/reactions/stream/:communityId - SSE endpoint (T043)
// ============================================================================

/**
 * NOTE: This SSE endpoint is NOT deprecated.
 * oRPC does not support Server-Sent Events streaming, so this endpoint remains as a legacy Hono route indefinitely.
 * Migration: 018-api-orpc, T039
 */
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
