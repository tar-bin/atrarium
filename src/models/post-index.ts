// Atrarium MVP - Post Index Model
// CRUD operations with AT-URI validation

import type { Env, PostIndex, PostIndexRow, SubmitPostRequest } from '../types';
import { DatabaseService, getCurrentTimestamp, parseJsonField } from '../services/db';

// ============================================================================
// Post Index Model
// ============================================================================

export class PostIndexModel {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env);
  }

  /**
   * Create post index entry (submit post to theme feed)
   */
  async create(data: SubmitPostRequest, authorDid: string): Promise<PostIndex> {
    // Validate AT-URI format
    this.validateAtUri(data.uri);

    const now = getCurrentTimestamp();

    // Extract metadata from URI (simplified - in production, fetch from Bluesky)
    const hasMedia = false; // TODO: Fetch from Bluesky PDS
    const langs = null; // TODO: Fetch from Bluesky PDS

    const result = await this.db.execute(
      `INSERT INTO post_index (uri, feed_id, author_did, created_at, has_media, langs)
      VALUES (?, ?, ?, ?, ?, ?)`,
      data.uri,
      data.feedId,
      authorDid,
      now,
      hasMedia ? 1 : 0,
      langs ? JSON.stringify(langs) : null
    );

    // Get the auto-incremented ID
    const id = result.meta?.last_row_id || 0;

    return {
      id,
      uri: data.uri,
      feedId: data.feedId,
      authorDid,
      createdAt: now,
      hasMedia,
      langs,
    };
  }

  /**
   * Get post index by URI
   */
  async getByUri(uri: string): Promise<PostIndex | null> {
    const row = await this.db.queryOne<PostIndexRow>(
      `SELECT * FROM post_index WHERE uri = ?`,
      uri
    );

    if (!row) return null;
    return this.rowToPostIndex(row);
  }

  /**
   * List posts for a theme feed (with pagination)
   */
  async listByFeed(
    feedId: string,
    limit = 50,
    cursor?: string
  ): Promise<{ posts: PostIndex[]; cursor?: string }> {
    // Parse cursor: {timestamp}::{id}
    let cursorTimestamp = Date.now();
    let cursorId = Number.MAX_SAFE_INTEGER;

    if (cursor) {
      const [ts, id] = cursor.split('::');
      cursorTimestamp = parseInt(ts, 10);
      cursorId = parseInt(id, 10);
    }

    const result = await this.db.query<PostIndexRow>(
      `SELECT * FROM post_index
      WHERE feed_id = ? AND (created_at < ? OR (created_at = ? AND id < ?))
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
      feedId,
      cursorTimestamp,
      cursorTimestamp,
      cursorId,
      limit
    );

    const posts = result.results?.map((row) => this.rowToPostIndex(row)) || [];

    // Generate next cursor
    let nextCursor: string | undefined;
    if (posts.length === limit && posts.length > 0) {
      const lastPost = posts[posts.length - 1];
      nextCursor = `${lastPost.createdAt}::${lastPost.id}`;
    }

    return { posts, cursor: nextCursor };
  }

  /**
   * List recent posts across multiple feeds (for feed mixing)
   */
  async listByFeeds(
    feedIds: string[],
    limit = 100
  ): Promise<PostIndex[]> {
    if (feedIds.length === 0) return [];

    const placeholders = feedIds.map(() => '?').join(',');
    const result = await this.db.query<PostIndexRow>(
      `SELECT * FROM post_index
      WHERE feed_id IN (${placeholders})
      ORDER BY created_at DESC
      LIMIT ?`,
      ...feedIds,
      limit
    );

    return result.results?.map((row) => this.rowToPostIndex(row)) || [];
  }

  /**
   * Delete post by URI (for deletion sync)
   */
  async deleteByUri(uri: string): Promise<void> {
    await this.db.execute(`DELETE FROM post_index WHERE uri = ?`, uri);
  }

  /**
   * Batch delete posts by URIs (for scheduled deletion sync)
   */
  async deleteBatch(uris: string[]): Promise<void> {
    if (uris.length === 0) return;

    const statements = uris.map((uri) =>
      this.db.prepare(`DELETE FROM post_index WHERE uri = ?`).bind(uri)
    );

    await this.db.batch(statements);
  }

  /**
   * Get recent post URIs for deletion sync (last 7 days)
   */
  async getRecentUris(days = 7): Promise<string[]> {
    const cutoff = getCurrentTimestamp() - days * 24 * 60 * 60;

    const result = await this.db.query<{ uri: string }>(
      `SELECT uri FROM post_index WHERE created_at > ? ORDER BY created_at DESC`,
      cutoff
    );

    return result.results?.map((row) => row.uri) || [];
  }

  /**
   * Count posts for a feed
   */
  async countByFeed(feedId: string): Promise<number> {
    const result = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM post_index WHERE feed_id = ?`,
      feedId
    );

    return result?.count || 0;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Validate AT-URI format (at://did:plc:xxx/app.bsky.feed.post/yyy)
   */
  private validateAtUri(uri: string): void {
    const atUriPattern = /^at:\/\/did:(plc|web):[a-z0-9._:-]+\/app\.bsky\.feed\.post\/[a-zA-Z0-9]+$/;

    if (!atUriPattern.test(uri)) {
      throw new Error(`Invalid AT-URI format: ${uri}`);
    }
  }

  /**
   * Convert database row to PostIndex object
   */
  private rowToPostIndex(row: PostIndexRow): PostIndex {
    return {
      id: row.id,
      uri: row.uri,
      feedId: row.feed_id,
      authorDid: row.author_did,
      createdAt: row.created_at,
      hasMedia: row.has_media === 1,
      langs: parseJsonField<string[]>(row.langs),
    };
  }
}
