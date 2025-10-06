// Lexicon Publication Routes
// Serves AT Protocol Lexicon schemas for Atrarium custom records
// Implements ETag-based HTTP caching (beta period: 1 hour, post-stabilization: 24 hours immutable)

import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Import Lexicon JSON schemas from top-level lexicons/ directory
import communityConfigSchema from '../../lexicons/net.atrarium.community.config.json';
import communityMembershipSchema from '../../lexicons/net.atrarium.community.membership.json';
import moderationActionSchema from '../../lexicons/net.atrarium.moderation.action.json';

type LexiconSchema = {
  lexicon: number;
  id: string;
  defs: Record<string, unknown>;
};

// Schema registry: NSID → Lexicon JSON
const SCHEMAS: Record<string, LexiconSchema> = {
  'net.atrarium.community.config': communityConfigSchema as LexiconSchema,
  'net.atrarium.community.membership': communityMembershipSchema as LexiconSchema,
  'net.atrarium.moderation.action': moderationActionSchema as LexiconSchema,
};

// Generate SHA-256 ETag (first 16 hex chars) for content-based caching
async function generateETag(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `"${hashHex.substring(0, 16)}"`;
}

const app = new Hono();

// CORS middleware for all Lexicon endpoints
app.use(
  '/xrpc/net.atrarium.lexicon.get',
  cors({
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['If-None-Match'],
    maxAge: 86400,
  })
);

// GET /xrpc/net.atrarium.lexicon.get?nsid={nsid}
// Returns Lexicon JSON schema with ETag and Cache-Control headers
app.get('/xrpc/net.atrarium.lexicon.get', async (c) => {
  const nsid = c.req.query('nsid');

  if (!nsid) {
    return c.json(
      {
        error: 'InvalidRequest',
        message: 'Missing required parameter: nsid',
      },
      400
    );
  }

  const schema = SCHEMAS[nsid];

  if (!schema) {
    return c.json(
      {
        error: 'InvalidRequest',
        message: `Lexicon schema not found: ${nsid}`,
      },
      404
    );
  }

  // Serialize schema to JSON (stable stringification)
  const schemaJson = JSON.stringify(schema);

  // Generate ETag for conditional requests
  const etag = await generateETag(schemaJson);

  // Check If-None-Match header for conditional request
  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    // Return 304 Not Modified with ETag header, no body
    return c.body(null, 304, {
      ETag: etag,
    });
  }

  // Return 200 OK with schema JSON, ETag, and Cache-Control headers
  return c.json(schema, 200, {
    ETag: etag,
    'Cache-Control': 'public, max-age=3600', // Beta period: 1 hour
    // Post-stabilization: 'public, max-age=86400, immutable' (24 hours)
  });
});

// OPTIONS /xrpc/net.atrarium.lexicon.get
// CORS preflight handler (handled by cors() middleware above)
app.options('/xrpc/net.atrarium.lexicon.get', (c) => {
  // CORS headers already set by middleware
  return c.body(null, 204);
});

export default app;
