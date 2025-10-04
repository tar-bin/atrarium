import type { ModerationLog, ModerationLogRow, ModerationAction } from '../types';

/**
 * Moderation Log Model
 * Audit trail for all moderation actions
 */

function rowToEntity(row: ModerationLogRow): ModerationLog {
  return {
    id: row.id,
    action: row.action as ModerationAction,
    targetUri: row.target_uri,
    feedId: row.feed_id,
    communityId: row.community_id,
    moderatorDid: row.moderator_did,
    reason: row.reason,
    performedAt: row.performed_at,
  };
}

export const ModerationLogModel = {
  /**
   * Create a moderation log entry
   */
  async createLog(
    db: D1Database,
    action: ModerationAction,
    targetUri: string,
    moderatorDid: string,
    options?: {
      feedId?: string;
      communityId?: string;
      reason?: string;
    }
  ): Promise<ModerationLog> {
    const now = Math.floor(Date.now() / 1000);

    const result = await db
      .prepare(
        `INSERT INTO moderation_logs (action, target_uri, feed_id, community_id, moderator_did, reason, performed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      )
      .bind(
        action,
        targetUri,
        options?.feedId || null,
        options?.communityId || null,
        moderatorDid,
        options?.reason || null,
        now
      )
      .first<ModerationLogRow>();

    if (!result) {
      throw new Error('Failed to create moderation log');
    }

    return rowToEntity(result);
  },

  /**
   * Get moderation logs for a specific feed
   */
  async getLogsByFeed(
    db: D1Database,
    feedId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<{ logs: ModerationLog[]; cursor?: string }> {
    const cursorTime = cursor ? parseInt(cursor, 10) : Math.floor(Date.now() / 1000);

    const result = await db
      .prepare(
        `SELECT * FROM moderation_logs
         WHERE feed_id = ? AND performed_at < ?
         ORDER BY performed_at DESC
         LIMIT ?`
      )
      .bind(feedId, cursorTime, limit + 1)
      .all<ModerationLogRow>();

    const logs = result.results.slice(0, limit).map(rowToEntity);
    const nextCursor =
      result.results.length > limit && result.results[limit]
        ? result.results[limit]!.performed_at.toString()
        : undefined;

    return { logs, cursor: nextCursor };
  },

  /**
   * Get moderation logs for a specific community
   */
  async getLogsByCommunity(
    db: D1Database,
    communityId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<{ logs: ModerationLog[]; cursor?: string }> {
    const cursorTime = cursor ? parseInt(cursor, 10) : Math.floor(Date.now() / 1000);

    const result = await db
      .prepare(
        `SELECT * FROM moderation_logs
         WHERE community_id = ? AND performed_at < ?
         ORDER BY performed_at DESC
         LIMIT ?`
      )
      .bind(communityId, cursorTime, limit + 1)
      .all<ModerationLogRow>();

    const logs = result.results.slice(0, limit).map(rowToEntity);
    const nextCursor =
      result.results.length > limit && result.results[limit]
        ? result.results[limit]!.performed_at.toString()
        : undefined;

    return { logs, cursor: nextCursor };
  },

  /**
   * Get logs for a specific target (post URI or user DID)
   */
  async getLogsByTarget(db: D1Database, targetUri: string): Promise<ModerationLog[]> {
    const result = await db
      .prepare(
        `SELECT * FROM moderation_logs
         WHERE target_uri = ?
         ORDER BY performed_at DESC`
      )
      .bind(targetUri)
      .all<ModerationLogRow>();

    return result.results.map(rowToEntity);
  },
};
