// Atrarium MVP - Main entry point
// Cloudflare Workers handler with Hono router + oRPC

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { RPCHandler } from '@orpc/server/fetch';
import type { Env, HonoVariables } from './types';
import type { Context } from './router';

// Import oRPC router
import { router } from './router';

// Import routes (legacy, to be migrated)
import feedGeneratorRoutes from './routes/feed-generator';
import authRoutes from './routes/auth';
// import communityRoutes from './routes/communities'; // Migrated to oRPC
// import themeFeedRoutes from './routes/theme-feeds'; // TODO: Migrate to PDS-first
// import postRoutes from './routes/posts'; // TODO: Migrate to PDS-first
import membershipRoutes from './routes/memberships';
import moderationRoutes from './routes/moderation';

// Import OpenAPI generator
import { generateOpenAPISpec } from './openapi';

// ============================================================================
// Main Application
// ============================================================================

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// ============================================================================
// Middleware
// ============================================================================

// CORS (allow all origins for Phase 0)
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Logging (development only)
app.use('*', async (c, next) => {
  if (c.env.ENVIRONMENT === 'development') {
    return logger()(c, next);
  }
  await next();
});

// Global error handler
app.onError((err, c) => {
  console.error('[Global Error]', err);
  return c.json(
    {
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      details: c.env.ENVIRONMENT === 'development' ? err.message : undefined,
    },
    500
  );
});

// ============================================================================
// Routes
// ============================================================================

// oRPC handler with Hono integration
const rpcHandler = new RPCHandler(router);

// OpenAPI specification endpoint (before oRPC handler)
app.get('/api/openapi.json', async (c) => {
  const spec = await generateOpenAPISpec();
  return c.json(spec);
});

// Swagger UI endpoint (before oRPC handler)
app.get('/api/docs', (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Atrarium API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
  `.trim();
  return c.html(html);
});

// oRPC middleware for API routes
app.use('/api/*', async (c, next) => {
  // Skip docs and openapi.json endpoints
  if (c.req.path === '/api/docs' || c.req.path === '/api/openapi.json') {
    return next();
  }

  // Extract user DID from JWT for oRPC context
  const authHeader = c.req.header('Authorization') || null;
  let userDid: string | undefined;

  if (authHeader) {
    try {
      const { AuthService } = await import('./services/auth');
      const authService = new AuthService(c.env);
      userDid = await authService.extractUserFromHeader(authHeader);
    } catch {
      // Continue without userDid for public endpoints
    }
  }

  const context: Context = {
    env: c.env,
    userDid,
  };

  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: '/api',
    context,
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  await next();
});

// AT Protocol Feed Generator API
app.route('/', feedGeneratorRoutes);

// Dashboard API (legacy routes, to be migrated to oRPC)
app.route('/api/auth', authRoutes);
// app.route('/api/communities', communityRoutes); // Migrated to oRPC
// app.route('/api/communities', themeFeedRoutes); // TODO: Migrate to PDS-first
// app.route('/api/posts', postRoutes); // TODO: Migrate to PDS-first
app.route('/api/communities', membershipRoutes);
app.route('/api/moderation', moderationRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'atrarium-mvp',
    version: '0.1.0',
    timestamp: Date.now(),
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'NotFound',
      message: 'The requested resource was not found',
    },
    404
  );
});

// ============================================================================
// Scheduled Jobs (Cron Triggers)
// ============================================================================

async function handleScheduledJob(_env: Env, _ctx: ExecutionContext) {
  console.log('[Scheduled Job] Starting cleanup (PDS-first architecture)');

  try {
    // TODO: Implement PDS-based cleanup logic
    // - Trigger Durable Object cleanup alarms
    // - Check for deleted posts via AT Protocol
    console.log('[Scheduled Job] Completed successfully');
  } catch (err) {
    console.error('[Scheduled Job] Error:', err);
  }
}

// ============================================================================
// Cloudflare Workers Exports
// ============================================================================

// Export Durable Objects (T037)
export { CommunityFeedGenerator } from './durable-objects/community-feed-generator';
export { FirehoseReceiver } from './durable-objects/firehose-receiver';

// Export Queue consumer (T037)
export { default as queue } from './workers/firehose-processor';

// Export app type for oRPC client type inference
export type AppType = typeof app;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduledJob(env, ctx));
  },
};
