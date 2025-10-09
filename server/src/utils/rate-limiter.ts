/**
 * Rate Limiter Utility
 *
 * Implements sliding window rate limiting (100 reactions/hour/user)
 * using Durable Objects Storage for timestamp tracking.
 */

import type { DurableObjectStorage } from '@cloudflare/workers-types';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // Seconds until rate limit resets
  remaining?: number; // Remaining requests in current window
}

export interface RateLimiterConfig {
  maxRequests: number; // Maximum requests per window (default: 100)
  windowMs: number; // Time window in milliseconds (default: 3600000 = 1 hour)
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxRequests: 100,
  windowMs: 3600000, // 1 hour
};

/**
 * Check rate limit for a user
 *
 * @param storage - Durable Object Storage instance
 * @param userId - User DID to check limit for
 * @param config - Optional rate limiter configuration
 * @returns Rate limit result with allowed status and retry info
 */
export async function checkRateLimit(
  storage: DurableObjectStorage,
  userId: string,
  config: Partial<RateLimiterConfig> = {}
): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing timestamps
  const record = await storage.get<{ timestamps: number[] }>(key);
  const allTimestamps = record?.timestamps || [];

  // Filter to timestamps within current window
  const recentTimestamps = allTimestamps.filter((ts) => ts > windowStart);

  // Check if limit exceeded
  if (recentTimestamps.length >= maxRequests) {
    const oldestTimestamp = recentTimestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

    return {
      allowed: false,
      retryAfter,
      remaining: 0,
    };
  }

  // Add current timestamp
  recentTimestamps.push(now);

  // Store updated timestamps with TTL
  await storage.put(
    key,
    { timestamps: recentTimestamps },
    {
      expirationTtl: Math.ceil(windowMs / 1000),
    }
  );

  return {
    allowed: true,
    remaining: maxRequests - recentTimestamps.length,
  };
}

/**
 * Reset rate limit for a user (admin utility)
 *
 * @param storage - Durable Object Storage instance
 * @param userId - User DID to reset limit for
 */
export async function resetRateLimit(storage: DurableObjectStorage, userId: string): Promise<void> {
  const key = `ratelimit:${userId}`;
  await storage.delete(key);
}

/**
 * Get current rate limit status for a user (without incrementing)
 *
 * @param storage - Durable Object Storage instance
 * @param userId - User DID to check
 * @param config - Optional rate limiter configuration
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  storage: DurableObjectStorage,
  userId: string,
  config: Partial<RateLimiterConfig> = {}
): Promise<{ remaining: number; resetAt: number }> {
  const { maxRequests, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = await storage.get<{ timestamps: number[] }>(key);
  const allTimestamps = record?.timestamps || [];
  const recentTimestamps = allTimestamps.filter((ts) => ts > windowStart);

  const remaining = Math.max(0, maxRequests - recentTimestamps.length);
  const resetAt = recentTimestamps.length > 0 ? recentTimestamps[0] + windowMs : now;

  return { remaining, resetAt };
}
