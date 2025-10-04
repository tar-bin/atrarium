import { describe, it, expect, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';

/**
 * Unit tests for membership validation logic
 * Tests the dual verification: hashtag + membership check
 */
describe('Unit: Membership validation', () => {
  const testCommunityId = 'test-community-validation-001';
  const testFeedId = 'test-feed-validation-001';
  const testHashtag = '#atr_v4l1d4t3';
  const memberDid = 'did:plc:member-validation-001';
  const nonMemberDid = 'did:plc:nonmember-validation-001';

  beforeAll(async () => {
    const now = Math.floor(Date.now() / 1000);

    // Create community
    await env.DB.prepare(`
      INSERT INTO communities (id, name, stage, created_at)
      VALUES (?, ?, 'theme', ?)
    `).bind(testCommunityId, 'Validation Test Community', now).run();

    // Create feed
    await env.DB.prepare(`
      INSERT INTO theme_feeds (id, community_id, name, hashtag, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(testFeedId, testCommunityId, 'Validation Feed', testHashtag, now).run();

    // Add member
    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'member', ?)
    `).bind(testCommunityId, memberDid, now).run();
  });

  // This function will be implemented in src/services/membership-validator.ts
  async function validateMembership(
    db: D1Database,
    feedId: string,
    userDid: string
  ): Promise<{ isValid: boolean; communityId?: string; role?: string }> {
    // Query to check if user is a member of the feed's community
    const result = await db.prepare(`
      SELECT m.community_id, m.role
      FROM theme_feeds f
      INNER JOIN memberships m ON m.community_id = f.community_id
      WHERE f.id = ? AND m.user_did = ?
    `).bind(feedId, userDid).first<{ community_id: string; role: string }>();

    if (!result) {
      return { isValid: false };
    }

    return {
      isValid: true,
      communityId: result.community_id,
      role: result.role,
    };
  }

  it('should return valid for existing community member', async () => {
    const validation = await validateMembership(env.DB, testFeedId, memberDid);

    expect(validation.isValid).toBe(true);
    expect(validation.communityId).toBe(testCommunityId);
    expect(validation.role).toBe('member');
  });

  it('should return invalid for non-member', async () => {
    const validation = await validateMembership(env.DB, testFeedId, nonMemberDid);

    expect(validation.isValid).toBe(false);
    expect(validation.communityId).toBeUndefined();
    expect(validation.role).toBeUndefined();
  });

  it('should return invalid for non-existent feed', async () => {
    const validation = await validateMembership(env.DB, 'non-existent-feed', memberDid);

    expect(validation.isValid).toBe(false);
  });

  it('should return correct role for different membership types', async () => {
    const now = Math.floor(Date.now() / 1000);
    const moderatorDid = 'did:plc:moderator-validation-001';
    const ownerDid = 'did:plc:owner-validation-001';

    // Add moderator
    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'moderator', ?)
    `).bind(testCommunityId, moderatorDid, now).run();

    // Add owner
    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'owner', ?)
    `).bind(testCommunityId, ownerDid, now).run();

    const moderatorValidation = await validateMembership(env.DB, testFeedId, moderatorDid);
    const ownerValidation = await validateMembership(env.DB, testFeedId, ownerDid);

    expect(moderatorValidation.role).toBe('moderator');
    expect(ownerValidation.role).toBe('owner');
  });

  it('should validate membership via JOIN between theme_feeds and memberships', async () => {
    // Verify the SQL query logic
    const result = await env.DB.prepare(`
      SELECT m.community_id, m.role, f.id as feed_id
      FROM theme_feeds f
      INNER JOIN memberships m ON m.community_id = f.community_id
      WHERE f.id = ? AND m.user_did = ?
    `).bind(testFeedId, memberDid).first<{
      community_id: string;
      role: string;
      feed_id: string;
    }>();

    expect(result).toBeDefined();
    expect(result?.community_id).toBe(testCommunityId);
    expect(result?.feed_id).toBe(testFeedId);
  });

  it('should handle case where user is member of different community', async () => {
    const now = Math.floor(Date.now() / 1000);
    const otherCommunityId = 'other-community-001';
    const otherMemberDid = 'did:plc:other-member-001';

    // Create another community
    await env.DB.prepare(`
      INSERT INTO communities (id, name, stage, created_at)
      VALUES (?, ?, 'theme', ?)
    `).bind(otherCommunityId, 'Other Community', now).run();

    // Add user to other community
    await env.DB.prepare(`
      INSERT INTO memberships (community_id, user_did, role, joined_at)
      VALUES (?, ?, 'member', ?)
    `).bind(otherCommunityId, otherMemberDid, now).run();

    // User should NOT be valid for testFeedId (different community)
    const validation = await validateMembership(env.DB, testFeedId, otherMemberDid);

    expect(validation.isValid).toBe(false);
  });

  it('should support dual verification: hashtag presence + membership check', async () => {
    // Simulate post with correct hashtag
    const postText = `Great discussion! ${testHashtag}`;
    const hasHashtag = postText.includes(testHashtag);

    // Check membership
    const hasMembership = await validateMembership(env.DB, testFeedId, memberDid);

    // Both conditions must be true for valid post
    const isValidPost = hasHashtag && hasMembership.isValid;

    expect(isValidPost).toBe(true);
  });

  it('should reject post with hashtag but no membership', async () => {
    const postText = `Trying to post! ${testHashtag}`;
    const hasHashtag = postText.includes(testHashtag);

    const hasMembership = await validateMembership(env.DB, testFeedId, nonMemberDid);

    const isValidPost = hasHashtag && hasMembership.isValid;

    expect(isValidPost).toBe(false);
  });

  it('should reject post from member without hashtag', async () => {
    const postText = 'Forgot to add hashtag!';
    const hasHashtag = postText.includes(testHashtag);

    const hasMembership = await validateMembership(env.DB, testFeedId, memberDid);

    const isValidPost = hasHashtag && hasMembership.isValid;

    expect(isValidPost).toBe(false);
  });
});
