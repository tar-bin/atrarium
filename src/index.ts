// Atrarium MVP - Main entry point
// Cloudflare Workers handler with Hono router

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, HonoVariables } from './types';

// Import routes
import feedGeneratorRoutes from './routes/feed-generator';
import authRoutes from './routes/auth';
import communityRoutes from './routes/communities';
// import themeFeedRoutes from './routes/theme-feeds'; // TODO: Migrate to PDS-first
// import postRoutes from './routes/posts'; // TODO: Migrate to PDS-first
import membershipRoutes from './routes/memberships';
import moderationRoutes from './routes/moderation';

// Import services (if needed)

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

// AT Protocol Feed Generator API
app.route('/', feedGeneratorRoutes);

// Dashboard API
app.route('/api/auth', authRoutes);
app.route('/api/communities', communityRoutes);
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
