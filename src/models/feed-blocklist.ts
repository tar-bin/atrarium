import type { FeedBlocklist, FeedBlocklistRow } from '../types';

/**
 * Feed Blocklist Model
 * Manages blocked users for specific feeds/communities
 */

function rowToEntity(row: FeedBlocklistRow): FeedBlocklist {
  return {
    feedId: row.feed_id,
    blockedUserDid: row.blocked_user_did,
    reason: row.reason,
    blockedByDid: row.blocked_by_did,
    blockedAt: row.blocked_at,
  };
}

export const FeedBlocklistModel = {
  /**
   * Block a user from a specific feed
   */
  async createBlock(
    db: D1Database,
    feedId: string,
    userDid: string,
    blockedByDid: string,
    reason?: string
  ): Promise<FeedBlocklist> {
    const now = Math.floor(Date.now() / 1000);

    await db
      .prepare(
        `INSERT INTO feed_blocklist (feed_id, blocked_user_did, blocked_by_did, reason, blocked_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(feedId, userDid, blockedByDid, reason || null, now)
      .run();

    return {
      feedId,
      blockedUserDid: userDid,
      reason: reason || null,
      blockedByDid,
      blockedAt: now,
    };
  },

  /**
   * Get all blocked users for a feed
   */
  async getBlockedUsers(db: D1Database, feedId: string): Promise<FeedBlocklist[]> {
    const result = await db
      .prepare(`SELECT * FROM feed_blocklist WHERE feed_id = ? ORDER BY blocked_at DESC`)
      .bind(feedId)
      .all<FeedBlocklistRow>();

    return result.results.map(rowToEntity);
  },

  /**
   * Remove a user from feed blocklist
   */
  async removeBlock(db: D1Database, feedId: string, userDid: string): Promise<boolean> {
    const result = await db
      .prepare(`DELETE FROM feed_blocklist WHERE feed_id = ? AND blocked_user_did = ?`)
      .bind(feedId, userDid)
      .run();

    return result.meta.changes > 0;
  },

  /**
   * Check if a user is blocked from a feed
   */
  async isUserBlocked(db: D1Database, feedId: string, userDid: string): Promise<boolean> {
    const result = await db
      .prepare(`SELECT 1 FROM feed_blocklist WHERE feed_id = ? AND blocked_user_did = ?`)
      .bind(feedId, userDid)
      .first();

    return result !== null;
  },
};
