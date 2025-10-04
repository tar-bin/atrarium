import { PostIndexModel } from '../models/post-index';
import { FeedBlocklistModel } from '../models/feed-blocklist';
import { ModerationLogModel } from '../models/moderation-log';
import type { Env } from '../types';

/**
 * Moderation Service
 * Business logic for post hiding, user blocking, and membership removal
 */

export class ModerationService {
  constructor(private env: Env) {}

  /**
   * Hide a post (set moderation_status to 'hidden')
   */
  async hidePost(
    postUri: string,
    moderatorDid: string,
    feedId: string,
    reason?: string
  ): Promise<{ success: boolean; moderationStatus: string }> {
    const postModel = new PostIndexModel(this.env);

    // Update post moderation status
    const success = await postModel.updateModerationStatus(postUri, 'hidden');

    if (!success) {
      throw new Error('Post not found or already hidden');
    }

    // Log the action
    await ModerationLogModel.createLog(this.env.DB, 'hide_post', postUri, moderatorDid, {
      feedId,
      reason,
    });

    return {
      success: true,
      moderationStatus: 'hidden',
    };
  }

  /**
   * Unhide a post (set moderation_status to 'approved')
   */
  async unhidePost(
    postUri: string,
    moderatorDid: string,
    feedId: string
  ): Promise<{ success: boolean; moderationStatus: string }> {
    const postModel = new PostIndexModel(this.env);

    // Update post moderation status
    const success = await postModel.updateModerationStatus(postUri, 'approved');

    if (!success) {
      throw new Error('Post not found');
    }

    // Log the action
    await ModerationLogModel.createLog(this.env.DB, 'unhide_post', postUri, moderatorDid, {
      feedId,
    });

    return {
      success: true,
      moderationStatus: 'approved',
    };
  }

  /**
   * Block a user from a feed
   * All existing posts from this user become invisible via LEFT JOIN
   */
  async blockUser(
    feedId: string,
    userDid: string,
    moderatorDid: string,
    reason?: string
  ): Promise<{ success: boolean; blockedUserDid: string; affectedPosts: number }> {
    // Create blocklist entry
    await FeedBlocklistModel.createBlock(this.env.DB, feedId, userDid, moderatorDid, reason);

    // Count affected posts (for UI feedback)
    const affectedPosts = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM post_index
       WHERE feed_id = ? AND author_did = ? AND moderation_status = 'approved'`
    )
      .bind(feedId, userDid)
      .first<{ count: number }>();

    // Log the action
    await ModerationLogModel.createLog(this.env.DB, 'block_user', userDid, moderatorDid, {
      feedId,
      reason,
    });

    return {
      success: true,
      blockedUserDid: userDid,
      affectedPosts: affectedPosts?.count || 0,
    };
  }

  /**
   * Unblock a user from a feed
   */
  async unblockUser(
    feedId: string,
    userDid: string,
    moderatorDid: string
  ): Promise<{ success: boolean }> {
    // Remove from blocklist
    const success = await FeedBlocklistModel.removeBlock(this.env.DB, feedId, userDid);

    if (!success) {
      throw new Error('User not found in blocklist');
    }

    // Log the action
    await ModerationLogModel.createLog(this.env.DB, 'unblock_user', userDid, moderatorDid, {
      feedId,
    });

    return { success: true };
  }

  /**
   * Remove a user from community (invalidates all their posts)
   * This is more severe than blocking - it removes membership
   */
  async removeMember(
    communityId: string,
    userDid: string,
    moderatorDid: string,
    reason?: string
  ): Promise<{ success: boolean; affectedPosts: number }> {
    // Delete membership (posts become invisible via INNER JOIN failure)
    await this.env.DB.prepare(
      `DELETE FROM memberships WHERE community_id = ? AND user_did = ?`
    )
      .bind(communityId, userDid)
      .run();

    // Count affected posts across all feeds in community
    const result = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM post_index p
       INNER JOIN theme_feeds f ON p.feed_id = f.id
       WHERE f.community_id = ? AND p.author_did = ?`
    )
      .bind(communityId, userDid)
      .first<{ count: number }>();

    // Log the action
    await ModerationLogModel.createLog(this.env.DB, 'remove_member', userDid, moderatorDid, {
      communityId,
      reason,
    });

    return {
      success: true,
      affectedPosts: result?.count || 0,
    };
  }
}
