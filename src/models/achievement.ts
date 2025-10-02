// Atrarium MVP - Achievement Model (Stub for Phase 1+)
// Not used in Phase 0, included for schema completeness

import type { Env, Achievement } from '../types';
import { DatabaseService, getCurrentTimestamp } from '../services/db';

// ============================================================================
// Achievement Model (Phase 1+)
// ============================================================================

export class AchievementModel {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env);
  }

  /**
   * Create achievement (stub)
   */
  async create(
    userDid: string,
    achievementId: string,
    communityId: string | null = null
  ): Promise<Achievement> {
    const now = getCurrentTimestamp();

    const result = await this.db.execute(
      `INSERT INTO achievements (user_did, achievement_id, community_id, unlocked_at)
      VALUES (?, ?, ?, ?)`,
      userDid,
      achievementId,
      communityId,
      now
    );

    const id = result.meta?.last_row_id || 0;

    return {
      id,
      userDid,
      achievementId,
      communityId,
      unlockedAt: now,
    };
  }

  /**
   * List achievements for a user (stub)
   */
  async listByUser(_userDid: string): Promise<Achievement[]> {
    // Not implemented in Phase 0
    return [];
  }
}
