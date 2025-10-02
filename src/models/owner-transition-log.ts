// Atrarium MVP - Owner Transition Log Model
// Audit log for ownership changes

import type { Env, OwnerTransitionLog, OwnerTransitionLogRow, TransitionReason } from '../types';
import { DatabaseService } from '../services/db';

// ============================================================================
// Owner Transition Log Model
// ============================================================================

export class OwnerTransitionLogModel {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env);
  }

  /**
   * List transition logs for a community
   */
  async listByCommunity(communityId: string): Promise<OwnerTransitionLog[]> {
    const result = await this.db.query<OwnerTransitionLogRow>(
      `SELECT * FROM owner_transition_log WHERE community_id = ? ORDER BY transitioned_at DESC`,
      communityId
    );

    return result.results?.map((row) => this.rowToLog(row)) || [];
  }

  /**
   * Get latest transition for a community
   */
  async getLatest(communityId: string): Promise<OwnerTransitionLog | null> {
    const row = await this.db.queryOne<OwnerTransitionLogRow>(
      `SELECT * FROM owner_transition_log WHERE community_id = ? ORDER BY transitioned_at DESC LIMIT 1`,
      communityId
    );

    if (!row) return null;
    return this.rowToLog(row);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Convert database row to OwnerTransitionLog object
   */
  private rowToLog(row: OwnerTransitionLogRow): OwnerTransitionLog {
    return {
      id: row.id,
      communityId: row.community_id,
      previousOwnerDid: row.previous_owner_did,
      newOwnerDid: row.new_owner_did,
      reason: row.reason as TransitionReason,
      transitionedAt: row.transitioned_at,
    };
  }
}
