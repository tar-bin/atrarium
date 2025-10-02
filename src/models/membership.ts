// Atrarium MVP - Membership Model
// CRUD operations with role-based access and owner transfer

import type { Env, Membership, MembershipRow, MembershipRole } from '../types';
import { DatabaseService, getCurrentTimestamp } from '../services/db';

// ============================================================================
// Membership Model
// ============================================================================

export class MembershipModel {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env);
  }

  /**
   * Create a new membership (user joins community)
   */
  async create(communityId: string, userDid: string, role: MembershipRole = 'member'): Promise<Membership> {
    const now = getCurrentTimestamp();

    await this.db.execute(
      `INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, ?, ?)`,
      communityId,
      userDid,
      role,
      now
    );

    return {
      communityId,
      userDid,
      role,
      joinedAt: now,
      lastActivityAt: null,
    };
  }

  /**
   * Get membership by community and user
   */
  async getByUserAndCommunity(communityId: string, userDid: string): Promise<Membership | null> {
    const row = await this.db.queryOne<MembershipRow>(
      `SELECT * FROM memberships WHERE community_id = ? AND user_did = ?`,
      communityId,
      userDid
    );

    if (!row) return null;
    return this.rowToMembership(row);
  }

  /**
   * List all memberships for a community
   */
  async listByCommunity(communityId: string): Promise<Membership[]> {
    const result = await this.db.query<MembershipRow>(
      `SELECT * FROM memberships WHERE community_id = ? ORDER BY joined_at ASC`,
      communityId
    );

    return result.results?.map((row) => this.rowToMembership(row)) || [];
  }

  /**
   * List all memberships for a user
   */
  async listByUser(userDid: string): Promise<Membership[]> {
    const result = await this.db.query<MembershipRow>(
      `SELECT * FROM memberships WHERE user_did = ? ORDER BY last_activity_at DESC, joined_at DESC`,
      userDid
    );

    return result.results?.map((row) => this.rowToMembership(row)) || [];
  }

  /**
   * Get community owner
   */
  async getOwner(communityId: string): Promise<Membership | null> {
    const row = await this.db.queryOne<MembershipRow>(
      `SELECT * FROM memberships WHERE community_id = ? AND role = 'owner'`,
      communityId
    );

    if (!row) return null;
    return this.rowToMembership(row);
  }

  /**
   * Get next moderator by seniority (for owner transfer)
   */
  async getNextModerator(communityId: string): Promise<Membership | null> {
    const row = await this.db.queryOne<MembershipRow>(
      `SELECT * FROM memberships
      WHERE community_id = ? AND role = 'moderator'
      ORDER BY joined_at ASC
      LIMIT 1`,
      communityId
    );

    if (!row) return null;
    return this.rowToMembership(row);
  }

  /**
   * Update membership role
   */
  async updateRole(communityId: string, userDid: string, newRole: MembershipRole): Promise<void> {
    await this.db.execute(
      `UPDATE memberships SET role = ? WHERE community_id = ? AND user_did = ?`,
      newRole,
      communityId,
      userDid
    );
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity(communityId: string, userDid: string): Promise<void> {
    const now = getCurrentTimestamp();
    await this.db.execute(
      `UPDATE memberships SET last_activity_at = ? WHERE community_id = ? AND user_did = ?`,
      now,
      communityId,
      userDid
    );
  }

  /**
   * Transfer ownership (FR-040, FR-041)
   * @param communityId Community ID
   * @param fromDid Current owner DID
   * @param toDid New owner DID
   * @param reason Transfer reason
   */
  async transferOwnership(
    communityId: string,
    fromDid: string,
    toDid: string,
    reason: 'deletion' | 'inactivity' | 'vacation' | 'manual'
  ): Promise<void> {
    const now = getCurrentTimestamp();

    // Batch operation: downgrade old owner, upgrade new owner, log transition
    const statements = [
      // Downgrade old owner to moderator (or remove if deleted)
      this.db.prepare(
        reason === 'deletion'
          ? `DELETE FROM memberships WHERE community_id = ? AND user_did = ?`
          : `UPDATE memberships SET role = 'moderator' WHERE community_id = ? AND user_did = ?`
      ).bind(communityId, fromDid),

      // Upgrade new owner
      this.db.prepare(
        `UPDATE memberships SET role = 'owner' WHERE community_id = ? AND user_did = ?`
      ).bind(communityId, toDid),

      // Log transition
      this.db.prepare(
        `INSERT INTO owner_transition_log (community_id, previous_owner_did, new_owner_did, reason, transitioned_at)
        VALUES (?, ?, ?, ?, ?)`
      ).bind(communityId, fromDid, toDid, reason, now),
    ];

    await this.db.batch(statements);
  }

  /**
   * Handle owner deletion (FR-040, FR-041)
   * Auto-transfer to next moderator, else archive community
   */
  async handleOwnerDeletion(communityId: string, ownerDid: string): Promise<void> {
    const nextModerator = await this.getNextModerator(communityId);

    if (nextModerator) {
      // Transfer ownership to next moderator by seniority
      await this.transferOwnership(communityId, ownerDid, nextModerator.userDid, 'deletion');
    } else {
      // No moderators: archive community
      await this.db.execute(
        `UPDATE communities SET archived_at = ? WHERE id = ?`,
        getCurrentTimestamp(),
        communityId
      );

      // Delete owner membership
      await this.db.execute(
        `DELETE FROM memberships WHERE community_id = ? AND user_did = ?`,
        communityId,
        ownerDid
      );
    }
  }

  /**
   * Delete membership (user leaves community)
   */
  async delete(communityId: string, userDid: string): Promise<void> {
    // Check if user is owner
    const membership = await this.getByUserAndCommunity(communityId, userDid);
    if (membership?.role === 'owner') {
      throw new Error('Owner cannot leave community. Transfer ownership first.');
    }

    await this.db.execute(
      `DELETE FROM memberships WHERE community_id = ? AND user_did = ?`,
      communityId,
      userDid
    );
  }

  /**
   * Check if user has role in community
   */
  async hasRole(communityId: string, userDid: string, requiredRole: MembershipRole): Promise<boolean> {
    const membership = await this.getByUserAndCommunity(communityId, userDid);
    if (!membership) return false;

    // Role hierarchy: owner > moderator > member
    const roleHierarchy: Record<MembershipRole, number> = {
      owner: 3,
      moderator: 2,
      member: 1,
    };

    return roleHierarchy[membership.role] >= roleHierarchy[requiredRole];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Convert database row to Membership object
   */
  private rowToMembership(row: MembershipRow): Membership {
    return {
      communityId: row.community_id,
      userDid: row.user_did,
      role: row.role as MembershipRole,
      joinedAt: row.joined_at,
      lastActivityAt: row.last_activity_at,
    };
  }
}
