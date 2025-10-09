import type { BskyAgent } from '@atproto/api';

// ============================================================================
// Enums
// ============================================================================

export type CommunityStage = 'theme' | 'community' | 'graduated';
export type FeedStatus = 'active' | 'warning' | 'archived';
export type MembershipRole = 'owner' | 'moderator' | 'member';
export type ModerationStatus = 'approved' | 'hidden' | 'reported';
export type ModerationActionType =
  | 'hide_post'
  | 'unhide_post'
  | 'block_user'
  | 'unblock_user'
  | 'remove_member';

// ============================================================================
// Entity Interfaces
// ============================================================================

/**
 * UserSession - Local state for authenticated PDS session
 * Stored in browser memory/localStorage
 */
export interface UserSession {
  agent: BskyAgent | null;
  did: string | null;
  handle: string | null;
  isAuthenticated: boolean;
}

/**
 * Community - API response from GET /api/communities
 */
export interface Community {
  id: string;
  name: string;
  description: string | null;
  stage: CommunityStage;
  accessType?: 'open' | 'invite-only'; // NEW (013-join-leave-workflow)
  parentId: string | null;
  ownerDid: string;
  feedMixOwn: number; // 0.0-1.0
  feedMixParent: number; // 0.0-1.0
  feedMixGlobal: number; // 0.0-1.0
  memberCount: number;
  postCount: number;
  createdAt: number;
  graduatedAt: number | null;
  archivedAt: number | null;
}

/**
 * Feed - API response from GET /api/communities/:id/feeds
 */
export interface Feed {
  id: string;
  communityId: string;
  name: string;
  description: string | null;
  status: FeedStatus;
  hashtag: string;
  posts7d: number;
  activeUsers7d: number;
  lastPostAt: number | null;
  createdAt: number;
}

/**
 * Post - API response from GET /api/posts?feedId=xxx
 */
export interface Post {
  id: number;
  uri: string;
  feedId: string;
  communityId?: string; // Optional community ID for reaction SSE (016-slack-mastodon-misskey)
  authorDid: string;
  text: string;
  markdown?: string; // Optional Markdown content (015-markdown-pds)
  emojiShortcodes?: string[]; // Optional emoji shortcodes (015-markdown-pds)
  createdAt: number;
  hasMedia: boolean;
  langs: string[] | null;
  moderationStatus: ModerationStatus;
  indexedAt: number;
}

/**
 * ModerationAction - API response from GET /api/moderation/logs
 */
export interface ModerationAction {
  id: number;
  action: ModerationActionType;
  targetUri: string;
  feedId: string | null;
  communityId: string | null;
  moderatorDid: string;
  reason: string | null;
  performedAt: number;
}

/**
 * Membership - API response from GET /api/communities/:id/memberships
 */
export interface Membership {
  userDid: string;
  communityId: string;
  role: MembershipRole;
  joinedAt: number;
  lastActivityAt: number | null;
}

// ============================================================================
// Frontend-Specific Computed Properties (Helper Functions)
// ============================================================================

/**
 * Check if current user is community owner
 */
export function isOwner(community: Community, currentUserDid: string | null): boolean {
  return community.ownerDid === currentUserDid;
}

/**
 * Check if current user can moderate (owner or moderator role)
 */
export function canModerate(membership: Membership | null): boolean {
  return membership?.role === 'owner' || membership?.role === 'moderator';
}

/**
 * Check if feed is active
 */
export function isFeedActive(feed: Feed): boolean {
  return feed.status === 'active';
}

/**
 * Get hashtag without # prefix for clipboard
 */
export function getHashtagForCopy(hashtag: string): string {
  return hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
}

/**
 * Check if post is hidden
 */
export function isPostHidden(post: Post): boolean {
  return post.moderationStatus === 'hidden';
}

/**
 * Get human-readable action label
 */
export function getActionLabel(action: ModerationActionType): string {
  const labels: Record<ModerationActionType, string> = {
    hide_post: 'Hide Post',
    unhide_post: 'Unhide Post',
    block_user: 'Block User',
    unblock_user: 'Unblock User',
    remove_member: 'Remove Member',
  };
  return labels[action];
}
