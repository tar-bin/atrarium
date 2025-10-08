// Atrarium API Contracts - Zod Schemas
// Shared validation schemas for oRPC router

import { z } from 'zod';

// ============================================================================
// Community Schemas
// ============================================================================

export const CreateCommunitySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  parentId: z.string().uuid().optional(),
});

export const CommunityOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  stage: z.enum(['theme', 'community', 'graduated']),
  memberCount: z.number(),
  postCount: z.number(),
  createdAt: z.number(),
});

export const CommunityListOutputSchema = z.object({
  data: z.array(CommunityOutputSchema),
});

export const GetCommunityInputSchema = z.object({
  id: z.string(),
});

// ============================================================================
// Membership Schemas
// ============================================================================

// Input: List memberships for a community
export const ListMembershipsInputSchema = z.object({
  communityUri: z.string(), // AT-URI of community config
  status: z.enum(['active', 'pending', 'all']).optional(), // Filter by status
});

// Input: Get single membership
export const GetMembershipInputSchema = z.object({
  membershipUri: z.string(), // AT-URI of membership record
});

// Input: Join community (create membership with pending status for invite-only)
export const JoinCommunityInputSchema = z.object({
  communityUri: z.string(), // AT-URI of community to join
});

// Input: Leave community (set active: false)
export const LeaveCommunityInputSchema = z.object({
  membershipUri: z.string(), // AT-URI of membership record
});

// Input: Update membership role/customTitle (admin only)
export const UpdateMembershipInputSchema = z.object({
  membershipUri: z.string(),
  role: z.enum(['owner', 'moderator', 'member']).optional(),
  customTitle: z.string().max(50).optional(),
});

// Output: Single membership record
export const MembershipOutputSchema = z.object({
  uri: z.string(), // AT-URI
  community: z.string(), // AT-URI of community config
  role: z.enum(['owner', 'moderator', 'member']),
  status: z.enum(['active', 'pending']),
  joinedAt: z.string(), // ISO 8601
  active: z.boolean(),
  invitedBy: z.string().optional(), // DID
  customTitle: z.string().optional(),
  userDid: z.string(), // Derived from URI (at://DID/...)
});

// Output: List of memberships
export const MembershipListOutputSchema = z.object({
  data: z.array(MembershipOutputSchema),
});

// ============================================================================
// Join Request Schemas
// ============================================================================

// Input: List pending join requests (admin only)
export const ListJoinRequestsInputSchema = z.object({
  communityUri: z.string(), // AT-URI of community config
});

// Input: Approve join request (admin only)
export const ApproveJoinRequestInputSchema = z.object({
  membershipUri: z.string(), // AT-URI of pending membership record
});

// Input: Reject join request (admin only)
export const RejectJoinRequestInputSchema = z.object({
  membershipUri: z.string(), // AT-URI of pending membership record
});

// Output: Join request (same as pending membership)
export const JoinRequestOutputSchema = MembershipOutputSchema;

// Output: List of join requests
export const JoinRequestListOutputSchema = z.object({
  data: z.array(JoinRequestOutputSchema),
});

// ============================================================================
// Moderation Schemas
// ============================================================================

// Input: Hide post (moderator/owner only)
export const HidePostInputSchema = z.object({
  postUri: z.string(), // AT-URI of post
  postCid: z.string(), // CID of post (strongRef)
  communityUri: z.string(), // AT-URI of community
  reason: z
    .enum([
      'spam',
      'low_quality',
      'duplicate',
      'off_topic',
      'wrong_community',
      'guidelines_violation',
      'terms_violation',
      'copyright',
      'harassment',
      'hate_speech',
      'violence',
      'nsfw',
      'illegal_content',
      'bot_activity',
      'impersonation',
      'ban_evasion',
      'other',
    ])
    .optional(),
});

// Input: Unhide post (moderator/owner only)
export const UnhidePostInputSchema = z.object({
  postUri: z.string(), // AT-URI of post
  postCid: z.string(), // CID of post (strongRef)
  communityUri: z.string(), // AT-URI of community
});

// Input: Block user (moderator/owner only)
export const BlockUserInputSchema = z.object({
  userDid: z.string(), // DID of user to block
  communityUri: z.string(), // AT-URI of community
  reason: z
    .enum([
      'spam',
      'low_quality',
      'duplicate',
      'off_topic',
      'wrong_community',
      'guidelines_violation',
      'terms_violation',
      'copyright',
      'harassment',
      'hate_speech',
      'violence',
      'nsfw',
      'illegal_content',
      'bot_activity',
      'impersonation',
      'ban_evasion',
      'other',
    ])
    .optional(),
});

// Input: Unblock user (moderator/owner only)
export const UnblockUserInputSchema = z.object({
  userDid: z.string(), // DID of user to unblock
  communityUri: z.string(), // AT-URI of community
});

// Output: Moderation action record
export const ModerationActionOutputSchema = z.object({
  uri: z.string(), // AT-URI of moderation action
  action: z.enum(['hide_post', 'unhide_post', 'block_user', 'unblock_user']),
  target: z.union([
    z.object({ uri: z.string(), cid: z.string() }), // postTarget
    z.object({ did: z.string() }), // userTarget
  ]),
  community: z.string(), // AT-URI of community
  reason: z
    .enum([
      'spam',
      'low_quality',
      'duplicate',
      'off_topic',
      'wrong_community',
      'guidelines_violation',
      'terms_violation',
      'copyright',
      'harassment',
      'hate_speech',
      'violence',
      'nsfw',
      'illegal_content',
      'bot_activity',
      'impersonation',
      'ban_evasion',
      'other',
    ])
    .optional(),
  createdAt: z.string(), // ISO 8601
  moderatorDid: z.string(), // Derived from URI
});

// Output: List of moderation actions
export const ModerationActionListOutputSchema = z.object({
  data: z.array(ModerationActionOutputSchema),
});

// ============================================================================
// Feed Schemas
// ============================================================================

// Input: List feeds for current user
export const ListFeedsInputSchema = z.object({
  status: z.enum(['active', 'all']).optional(), // Filter by membership status
});

// Input: Get single feed
export const GetFeedInputSchema = z.object({
  communityUri: z.string(), // AT-URI of community config
});

// Output: Feed metadata
export const FeedOutputSchema = z.object({
  uri: z.string(), // AT-URI of feed generator
  communityUri: z.string(), // AT-URI of community config
  name: z.string(),
  description: z.string().nullable(),
  hashtag: z.string(), // #atrarium_[8-hex]
  stage: z.enum(['theme', 'community', 'graduated']),
  memberCount: z.number(), // PDS-feasible: count of active memberships
  pendingRequestCount: z.number(), // PDS-feasible: count of pending memberships
  createdAt: z.string(), // ISO 8601
});

// Output: List of feeds
export const FeedListOutputSchema = z.object({
  data: z.array(FeedOutputSchema),
});

// ============================================================================
// Post Schemas (014-bluesky: Custom Lexicon Posts)
// ============================================================================

// Input: Create post in community
export const CreatePostInputSchema = z.object({
  communityId: z
    .string()
    .length(8)
    .regex(/^[0-9a-f]{8}$/, 'Community ID must be 8-character hex'),
  text: z.string().min(1).max(300), // maxGraphemes: 300 in Lexicon
});

// Input: Get posts for community timeline
export const GetPostsInputSchema = z.object({
  communityId: z
    .string()
    .length(8)
    .regex(/^[0-9a-f]{8}$/, 'Community ID must be 8-character hex'),
  limit: z.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(), // Pagination cursor (timestamp:rkey)
});

// Input: Get single post by URI
export const GetPostInputSchema = z.object({
  uri: z
    .string()
    .startsWith('at://')
    .regex(
      /^at:\/\/did:(plc|web):[a-zA-Z0-9._-]+\/net\.atrarium\.community\.post\/[a-zA-Z0-9]+$/,
      'URI must be a valid net.atrarium.community.post AT-URI'
    ),
});

// Output: Author profile (app.bsky.actor.profile)
export const AuthorProfileSchema = z.object({
  did: z.string(),
  handle: z.string(),
  displayName: z.string().nullable(),
  avatar: z.string().url().nullable(),
});

// Output: Single post
export const PostOutputSchema = z.object({
  uri: z.string(), // AT-URI
  rkey: z.string(), // Record key
  text: z.string(),
  communityId: z.string(),
  createdAt: z.string(), // ISO 8601
  author: AuthorProfileSchema,
  moderationStatus: z.enum(['approved', 'hidden', 'reported']).optional(), // Only for moderators
});

// Output: Post creation response
export const CreatePostOutputSchema = z.object({
  uri: z.string(),
  rkey: z.string(),
  createdAt: z.string(),
});

// Output: List of posts
export const PostListOutputSchema = z.object({
  posts: z.array(PostOutputSchema),
  cursor: z.string().nullable(), // Next page cursor
});
