// Atrarium MVP - Community Model
// CRUD operations with stage transitions and feed mix validation

import type {
  Env,
  Community,
  CommunityRow,
  CommunityStage,
  CreateCommunityRequest,
} from '../types';
import { DatabaseService, generateUUID, getCurrentTimestamp, toCamelCase } from '../services/db';

// ============================================================================
// Community Model
// ============================================================================

export class CommunityModel {
  private db: DatabaseService;

  constructor(env: Env) {
    this.db = new DatabaseService(env);
  }

  /**
   * Create a new community (stage: theme)
   * @param data Community creation data
   * @param ownerDid Creator's DID (will be assigned as owner)
   * @returns Created community
   */
  async create(data: CreateCommunityRequest, ownerDid: string): Promise<Community> {
    const id = generateUUID();
    const now = getCurrentTimestamp();

    // Insert community
    await this.db.execute(
      `INSERT INTO communities (
        id, name, description, stage, parent_id,
        feed_mix_own, feed_mix_parent, feed_mix_global,
        member_count, post_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.name,
      data.description || null,
      'theme', // Always start as theme stage
      data.parentId || null,
      1.0, // Phase 0: 100% own content
      0.0,
      0.0,
      1, // Creator is first member
      0,
      now
    );

    // Create owner membership
    await this.db.execute(
      `INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, ?, ?)`,
      id,
      ownerDid,
      'owner',
      now
    );

    return {
      id,
      name: data.name,
      description: data.description || null,
      stage: 'theme',
      parentId: data.parentId || null,
      feedMixOwn: 1.0,
      feedMixParent: 0.0,
      feedMixGlobal: 0.0,
      memberCount: 1,
      postCount: 0,
      createdAt: now,
      graduatedAt: null,
      archivedAt: null,
    };
  }

  /**
   * Get community by ID
   */
  async getById(id: string): Promise<Community | null> {
    const row = await this.db.queryOne<CommunityRow>(
      `SELECT * FROM communities WHERE id = ? AND archived_at IS NULL`,
      id
    );

    if (!row) return null;
    return this.rowToCommunity(row);
  }

  /**
   * List all communities (optionally filtered by parent)
   */
  async list(parentId?: string | null): Promise<Community[]> {
    const query = parentId
      ? `SELECT * FROM communities WHERE parent_id = ? AND archived_at IS NULL ORDER BY created_at DESC`
      : `SELECT * FROM communities WHERE archived_at IS NULL ORDER BY created_at DESC`;

    const params = parentId ? [parentId] : [];
    const result = await this.db.query<CommunityRow>(query, ...params);

    return result.results?.map((row) => this.rowToCommunity(row)) || [];
  }

  /**
   * List communities where user is a member
   */
  async listByUser(userDid: string): Promise<Community[]> {
    const result = await this.db.query<CommunityRow>(
      `SELECT c.* FROM communities c
      JOIN memberships m ON c.id = m.community_id
      WHERE m.user_did = ? AND c.archived_at IS NULL
      ORDER BY m.last_activity_at DESC, c.created_at DESC`,
      userDid
    );

    return result.results?.map((row) => this.rowToCommunity(row)) || [];
  }

  /**
   * Update community (name, description, feed mix ratios)
   */
  async update(
    id: string,
    updates: Partial<{
      name: string;
      description: string | null;
      feedMixOwn: number;
      feedMixParent: number;
      feedMixGlobal: number;
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
    if (
      updates.feedMixOwn !== undefined &&
      updates.feedMixParent !== undefined &&
      updates.feedMixGlobal !== undefined
    ) {
      // Validate sum = 1.0
      const sum = updates.feedMixOwn + updates.feedMixParent + updates.feedMixGlobal;
      if (Math.abs(sum - 1.0) > 0.001) {
        throw new Error('Feed mix ratios must sum to 1.0');
      }

      setClauses.push('feed_mix_own = ?', 'feed_mix_parent = ?', 'feed_mix_global = ?');
      values.push(updates.feedMixOwn, updates.feedMixParent, updates.feedMixGlobal);
    }

    if (setClauses.length === 0) return;

    values.push(id);
    await this.db.execute(
      `UPDATE communities SET ${setClauses.join(', ')} WHERE id = ?`,
      ...values
    );
  }

  /**
   * Transition community stage (theme → community → graduated)
   * @param id Community ID
   * @param newStage Target stage
   */
  async transitionStage(id: string, newStage: CommunityStage): Promise<void> {
    const community = await this.getById(id);
    if (!community) throw new Error('Community not found');

    // Validate transition
    this.validateStageTransition(community.stage, newStage);

    const now = getCurrentTimestamp();
    const graduatedAt = newStage === 'graduated' ? now : null;

    await this.db.execute(
      `UPDATE communities SET stage = ?, graduated_at = ? WHERE id = ?`,
      newStage,
      graduatedAt,
      id
    );
  }

  /**
   * Increment member count
   */
  async incrementMemberCount(id: string): Promise<void> {
    await this.db.execute(
      `UPDATE communities SET member_count = member_count + 1 WHERE id = ?`,
      id
    );
  }

  /**
   * Decrement member count
   */
  async decrementMemberCount(id: string): Promise<void> {
    await this.db.execute(
      `UPDATE communities SET member_count = MAX(0, member_count - 1) WHERE id = ?`,
      id
    );
  }

  /**
   * Increment post count
   */
  async incrementPostCount(id: string): Promise<void> {
    await this.db.execute(
      `UPDATE communities SET post_count = post_count + 1 WHERE id = ?`,
      id
    );
  }

  /**
   * Archive community (soft delete)
   */
  async archive(id: string): Promise<void> {
    const now = getCurrentTimestamp();
    await this.db.execute(`UPDATE communities SET archived_at = ? WHERE id = ?`, now, id);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Validate stage transition according to data-model.md:99-118
   */
  private validateStageTransition(from: CommunityStage, to: CommunityStage): void {
    const validTransitions: Record<CommunityStage, CommunityStage[]> = {
      theme: ['community', 'graduated'],
      community: ['graduated'],
      graduated: ['community'],
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new Error(`Invalid stage transition: ${from} → ${to}`);
    }
  }

  /**
   * Convert database row to Community object
   */
  private rowToCommunity(row: CommunityRow): Community {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      stage: row.stage as CommunityStage,
      parentId: row.parent_id,
      feedMixOwn: row.feed_mix_own,
      feedMixParent: row.feed_mix_parent,
      feedMixGlobal: row.feed_mix_global,
      memberCount: row.member_count,
      postCount: row.post_count,
      createdAt: row.created_at,
      graduatedAt: row.graduated_at,
      archivedAt: row.archived_at,
    };
  }
}
