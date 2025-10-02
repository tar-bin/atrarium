// Atrarium MVP - Theme Feed Model
// CRUD operations with health metrics and status transitions

import type {
  Env,
  ThemeFeed,
  ThemeFeedRow,
  ThemeFeedStatus,
  CreateThemeFeedRequest,
} from '../types';
import { DatabaseService, generateUUID, getCurrentTimestamp } from '../services/db';

// ============================================================================
// Theme Feed Model
// ============================================================================

export class ThemeFeedModel {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env);
  }

  /**
   * Create a new theme feed
   */
  async create(communityId: string, data: CreateThemeFeedRequest): Promise<ThemeFeed> {
    const id = generateUUID();
    const now = getCurrentTimestamp();

    await this.db.execute(
      `INSERT INTO theme_feeds (
        id, community_id, name, description, status,
        posts_7d, active_users_7d, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      communityId,
      data.name,
      data.description || null,
      'active',
      0,
      0,
      now
    );

    return {
      id,
      communityId,
      name: data.name,
      description: data.description || null,
      status: 'active',
      lastPostAt: null,
      posts7d: 0,
      activeUsers7d: 0,
      createdAt: now,
      archivedAt: null,
    };
  }

  /**
   * Get theme feed by ID
   */
  async getById(id: string): Promise<ThemeFeed | null> {
    const row = await this.db.queryOne<ThemeFeedRow>(
      `SELECT * FROM theme_feeds WHERE id = ?`,
      id
    );

    if (!row) return null;
    return this.rowToThemeFeed(row);
  }

  /**
   * List theme feeds for a community
   */
  async listByCommunity(
    communityId: string,
    includeArchived = false
  ): Promise<ThemeFeed[]> {
    const query = includeArchived
      ? `SELECT * FROM theme_feeds WHERE community_id = ? ORDER BY last_post_at DESC, created_at DESC`
      : `SELECT * FROM theme_feeds WHERE community_id = ? AND archived_at IS NULL ORDER BY last_post_at DESC, created_at DESC`;

    const result = await this.db.query<ThemeFeedRow>(query, communityId);
    return result.results?.map((row) => this.rowToThemeFeed(row)) || [];
  }

  /**
   * Update theme feed (name, description)
   */
  async update(
    id: string,
    updates: Partial<{
      name: string;
      description: string | null;
    }>
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      values.push(updates.description);
    }

    if (setClauses.length === 0) return;

    values.push(id);
    await this.db.execute(
      `UPDATE theme_feeds SET ${setClauses.join(', ')} WHERE id = ?`,
      ...values
    );
  }

  /**
   * Update last post timestamp (called when new post is added)
   */
  async updateLastPostAt(id: string, timestamp: number): Promise<void> {
    await this.db.execute(
      `UPDATE theme_feeds SET last_post_at = ? WHERE id = ?`,
      timestamp,
      id
    );
  }

  /**
   * Transition status (active → warning → archived)
   * @param id Feed ID
   * @param newStatus Target status
   */
  async transitionStatus(id: string, newStatus: ThemeFeedStatus): Promise<void> {
    const feed = await this.getById(id);
    if (!feed) throw new Error('Theme feed not found');

    // Validate transition
    this.validateStatusTransition(feed.status, newStatus);

    const archivedAt = newStatus === 'archived' ? getCurrentTimestamp() : null;

    await this.db.execute(
      `UPDATE theme_feeds SET status = ?, archived_at = ? WHERE id = ?`,
      newStatus,
      archivedAt,
      id
    );
  }

  /**
   * Archive theme feed (soft delete)
   */
  async archive(id: string): Promise<void> {
    await this.transitionStatus(id, 'archived');
  }

  /**
   * Recalculate health metrics for a feed (posts_7d, active_users_7d)
   * Called by scheduled job (daily)
   */
  async updateHealthMetrics(id: string): Promise<void> {
    const now = getCurrentTimestamp();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60;

    // Count posts in last 7 days
    const postsResult = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM post_index
      WHERE feed_id = ? AND created_at > ?`,
      id,
      sevenDaysAgo
    );
    const posts7d = postsResult?.count || 0;

    // Count unique authors in last 7 days
    const usersResult = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT author_did) as count FROM post_index
      WHERE feed_id = ? AND created_at > ?`,
      id,
      sevenDaysAgo
    );
    const activeUsers7d = usersResult?.count || 0;

    // Update metrics
    await this.db.execute(
      `UPDATE theme_feeds SET posts_7d = ?, active_users_7d = ? WHERE id = ?`,
      posts7d,
      activeUsers7d,
      id
    );
  }

  /**
   * Check feed inactivity and update status (scheduled job, daily)
   * active → warning (7 days)
   * warning → archived (14 days)
   * archived → active (5+ posts/week, 3+ users)
   */
  async checkInactivityAndUpdateStatus(): Promise<void> {
    const now = getCurrentTimestamp();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60;

    // Active → Warning (FR-010)
    await this.db.execute(
      `UPDATE theme_feeds SET status = 'warning'
      WHERE status = 'active' AND (last_post_at IS NULL OR last_post_at < ?)`,
      sevenDaysAgo
    );

    // Warning → Archived (FR-011)
    await this.db.execute(
      `UPDATE theme_feeds SET status = 'archived', archived_at = ?
      WHERE status = 'warning' AND (last_post_at IS NULL OR last_post_at < ?)`,
      now,
      fourteenDaysAgo
    );

    // Archived → Active (FR-012: revival)
    await this.db.execute(
      `UPDATE theme_feeds SET status = 'active', archived_at = NULL
      WHERE status = 'archived' AND posts_7d >= 5 AND active_users_7d >= 3`
    );
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Validate status transition according to data-model.md:171-184
   */
  private validateStatusTransition(from: ThemeFeedStatus, to: ThemeFeedStatus): void {
    const validTransitions: Record<ThemeFeedStatus, ThemeFeedStatus[]> = {
      active: ['warning', 'archived'],
      warning: ['archived', 'active'],
      archived: ['active'],
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new Error(`Invalid status transition: ${from} → ${to}`);
    }
  }

  /**
   * Convert database row to ThemeFeed object
   */
  private rowToThemeFeed(row: ThemeFeedRow): ThemeFeed {
    return {
      id: row.id,
      communityId: row.community_id,
      name: row.name,
      description: row.description,
      status: row.status as ThemeFeedStatus,
      lastPostAt: row.last_post_at,
      posts7d: row.posts_7d,
      activeUsers7d: row.active_users_7d,
      createdAt: row.created_at,
      archivedAt: row.archived_at,
    };
  }
}
