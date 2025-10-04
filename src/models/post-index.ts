// Atrarium MVP - Post Index Model
// CRUD operations with AT-URI validation

import type { Env, PostIndex, PostIndexRow, SubmitPostRequest, ModerationStatus } from '../types';
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
      `INSERT INTO post_index (uri, feed_id, author_did, created_at, has_media, langs, moderation_status, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      data.uri,
      data.feedId,
      authorDid,
      now,
      hasMedia ? 1 : 0,
      langs ? JSON.stringify(langs) : null,
      'approved',
      now
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
      moderationStatus: 'approved',
      indexedAt: now,
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
      cursorTimestamp = parseInt(ts || '0', 10);
      cursorId = parseInt(id || '0', 10);
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
      if (lastPost) {
        nextCursor = `${lastPost.createdAt}::${lastPost.id}`;
      }
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

  /**
   * Update moderation status for a post
   */
  async updateModerationStatus(uri: string, newStatus: ModerationStatus): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE post_index SET moderation_status = ? WHERE uri = ?`,
      newStatus,
      uri
    );

    return result.meta.changes > 0;
  }

  /**
   * Get posts by moderation status
   */
  async getPostsByModerationStatus(
    feedId: string,
    status: ModerationStatus,
    limit = 50
  ): Promise<PostIndex[]> {
    const result = await this.db.query<PostIndexRow>(
      `SELECT * FROM post_index
       WHERE feed_id = ? AND moderation_status = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      feedId,
      status,
      limit
    );

    return result.results?.map((row) => this.rowToPostIndex(row)) || [];
  }

  /**
   * Get feed skeleton with membership validation and moderation filtering
   * This is the main query for Feed Generator API
   */
  async getFeedSkeletonWithMembership(
    feedId: string,
    limit = 50,
    cursor?: string
  ): Promise<{ uris: string[]; cursor?: string }> {
    // Parse cursor
    let cursorTimestamp = Date.now();
    let cursorId = Number.MAX_SAFE_INTEGER;

    if (cursor) {
      const [ts, id] = cursor.split('::');
      cursorTimestamp = parseInt(ts || '0', 10);
      cursorId = parseInt(id || '0', 10);
    }

    // Query with INNER JOIN memberships + LEFT JOIN feed_blocklist
    const result = await this.db.query<{ uri: string; created_at: number; id: number }>(
      `SELECT p.uri, p.created_at, p.id
       FROM post_index p
       INNER JOIN theme_feeds f ON p.feed_id = f.id
       INNER JOIN memberships m ON p.author_did = m.user_did AND m.community_id = f.community_id
       LEFT JOIN feed_blocklist b ON b.feed_id = p.feed_id AND b.blocked_user_did = p.author_did
       WHERE p.feed_id = ?
         AND p.moderation_status = 'approved'
         AND b.blocked_user_did IS NULL
         AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      feedId,
      cursorTimestamp,
      cursorTimestamp,
      cursorId,
      limit + 1
    );

    const rows = result.results || [];
    const uris = rows.slice(0, limit).map((row) => row.uri);

    // Generate next cursor
    let nextCursor: string | undefined;
    if (rows.length > limit) {
      const lastRow = rows[limit];
      if (lastRow) {
        nextCursor = `${lastRow.created_at}::${lastRow.id}`;
      }
    }

    return { uris, cursor: nextCursor };
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
      moderationStatus: (row.moderation_status as ModerationStatus) || 'approved',
      indexedAt: row.indexed_at,
    };
  }
}
