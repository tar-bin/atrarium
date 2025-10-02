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
import themeFeedRoutes from './routes/theme-feeds';
import postRoutes from './routes/posts';
import membershipRoutes from './routes/memberships';

// Import models for scheduled jobs
import { ThemeFeedModel } from './models/theme-feed';
import { PostIndexModel } from './models/post-index';
import { ATProtoService } from './services/atproto';
import { CacheService } from './services/cache';

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
app.route('/api/communities', themeFeedRoutes);
app.route('/api/posts', postRoutes);
app.route('/api/communities', membershipRoutes);

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

async function handleScheduledJob(env: Env, _ctx: ExecutionContext) {
  console.log('[Scheduled Job] Starting post deletion sync and feed health check');

  try {
    // 1. Post Deletion Sync (research.md:387-413)
    const postIndexModel = new PostIndexModel(env);
    const atprotoService = new ATProtoService(env);
    const cacheService = new CacheService(env);

    // Get recent post URIs (last 7 days)
    const recentUris = await postIndexModel.getRecentUris(7);

    // Check which posts no longer exist on Bluesky
    const deletedUris = await atprotoService.checkPostsExistence(recentUris);

    if (deletedUris.length > 0) {
      console.log(`[Scheduled Job] Deleting ${deletedUris.length} posts`);

      // Delete from database and cache
      await postIndexModel.deleteBatch(deletedUris);
      await cacheService.deletePostMetadataBatch(deletedUris);
    }

    // 2. Theme Feed Health Check (data-model.md:171-184)
    const themeFeedModel = new ThemeFeedModel(env);

    // Update all feed health metrics (posts_7d, active_users_7d)
    const feeds = await env.DB.prepare(`SELECT id FROM theme_feeds`).all();
    for (const feed of feeds.results || []) {
      await themeFeedModel.updateHealthMetrics((feed as any).id);
    }

    // Check inactivity and update statuses (active→warning→archived)
    await themeFeedModel.checkInactivityAndUpdateStatus();

    console.log('[Scheduled Job] Completed successfully');
  } catch (err) {
    console.error('[Scheduled Job] Error:', err);
  }
}

// ============================================================================
// Cloudflare Workers Exports
// ============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduledJob(env, ctx));
  },
};
