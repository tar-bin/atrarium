// Atrarium MVP - Cache Service
// KV cache-aside pattern for post metadata (7-day TTL)

import type { Env, PostIndex } from '../types';

// ============================================================================
// Cache Service
// ============================================================================

export class CacheService {
  private env: Env;
  private defaultTTL = 7 * 24 * 60 * 60; // 7 days

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Get post metadata from cache
   */
  async getPostMetadata(uri: string): Promise<PostIndex | null> {
    const cached = await this.env.POST_CACHE.get(`post:${uri}`, { type: 'json' });
    return cached as PostIndex | null;
  }

  /**
   * Set post metadata in cache
   */
  async setPostMetadata(uri: string, post: PostIndex): Promise<void> {
    await this.env.POST_CACHE.put(`post:${uri}`, JSON.stringify(post), {
      expirationTtl: this.defaultTTL,
    });
  }

  /**
   * Delete post metadata from cache
   */
  async deletePostMetadata(uri: string): Promise<void> {
    await this.env.POST_CACHE.delete(`post:${uri}`);
  }

  /**
   * Batch delete post metadata
   */
  async deletePostMetadataBatch(uris: string[]): Promise<void> {
    await Promise.all(uris.map((uri) => this.deletePostMetadata(uri)));
  }

  /**
   * Cache community metadata (1-hour TTL)
   */
  async getCommunityMetadata(id: string): Promise<unknown | null> {
    const cached = await this.env.POST_CACHE.get(`community:${id}`, { type: 'json' });
    return cached;
  }

  /**
   * Set community metadata in cache
   */
  async setCommunityMetadata(id: string, data: unknown): Promise<void> {
    await this.env.POST_CACHE.put(`community:${id}`, JSON.stringify(data), {
      expirationTtl: 60 * 60, // 1 hour
    });
  }

  /**
   * Delete community metadata from cache
   */
  async deleteCommunityMetadata(id: string): Promise<void> {
    await this.env.POST_CACHE.delete(`community:${id}`);
  }

  /**
   * Generic get with custom TTL
   */
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.env.POST_CACHE.get(key, { type: 'json' });
    return cached as T | null;
  }

  /**
   * Generic set with custom TTL
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.env.POST_CACHE.put(key, JSON.stringify(value), {
      expirationTtl: ttlSeconds || this.defaultTTL,
    });
  }

  /**
   * Generic delete
   */
  async delete(key: string): Promise<void> {
    await this.env.POST_CACHE.delete(key);
  }
}
