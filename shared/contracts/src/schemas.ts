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

// Input: List moderation actions for a community
export const ListModerationActionsInputSchema = z.object({
  communityUri: z.string(), // AT-URI of community config (required for filtering)
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

// ============================================================================
// Emoji Schemas (T033 - 015-markdown-pds)
// ============================================================================

// T033: BlobRef schema (AT Protocol blob reference)
export const BlobRefSchema = z.object({
  $type: z.literal('blob'),
  ref: z.object({ $link: z.string() }), // CID
  mimeType: z.string(),
  size: z.number().int().min(1),
});

// T033: CustomEmoji schema (user-uploaded emoji in PDS)
export const CustomEmojiSchema = z.object({
  $type: z.literal('net.atrarium.emoji.custom'),
  shortcode: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_]+$/),
  blob: BlobRefSchema,
  creator: z.string(), // DID
  uploadedAt: z.string(), // ISO 8601
  format: z.enum(['png', 'gif', 'webp']),
  size: z.number().int().min(1).max(512000), // ≤500KB
  dimensions: z.object({
    width: z.number().int().min(1).max(256),
    height: z.number().int().min(1).max(256),
  }),
  animated: z.boolean(),
});

// T033: EmojiApproval schema (community owner approval decision)
export const EmojiApprovalSchema = z.object({
  $type: z.literal('net.atrarium.emoji.approval'),
  shortcode: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_]+$/),
  emojiRef: z.string(), // AT-URI of CustomEmoji
  communityId: z.string().regex(/^[0-9a-f]{8}$/),
  status: z.enum(['approved', 'rejected', 'revoked']),
  approver: z.string(), // DID
  decidedAt: z.string(), // ISO 8601
  reason: z.string().max(500).optional(),
});

// T033: EmojiSubmission schema (pending approval request)
export const EmojiSubmissionSchema = z.object({
  emojiUri: z.string(), // AT-URI of CustomEmoji
  shortcode: z.string(),
  creator: z.string(), // DID
  creatorHandle: z.string(),
  uploadedAt: z.string(),
  format: z.enum(['png', 'gif', 'webp']),
  animated: z.boolean(),
  blobUrl: z.string().url(), // Preview URL
});

// T033: EmojiMetadata schema (for rendering)
export const EmojiMetadataSchema = z.object({
  emojiURI: z.string(), // AT-URI of CustomEmoji
  blobURI: z.string(), // Blob URL for rendering
  animated: z.boolean(),
});

// ============================================================================
// Emoji API Input/Output Schemas (T033)
// ============================================================================

// POST /api/emoji/upload
export const UploadEmojiInputSchema = z.object({
  file: z.any(), // Blob type (client-side only, not available in Node.js)
  shortcode: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_]+$/),
});

export const UploadEmojiOutputSchema = z.object({
  emojiURI: z.string(),
  blob: BlobRefSchema,
});

// GET /api/emoji/list
export const ListEmojiInputSchema = z.object({
  did: z.string(),
});

export const ListEmojiOutputSchema = z.object({
  emoji: z.array(CustomEmojiSchema.extend({ uri: z.string() })),
});

// POST /api/communities/:id/emoji/submit
export const SubmitEmojiInputSchema = z.object({
  communityId: z.string().regex(/^[0-9a-f]{8}$/),
  emojiURI: z.string(),
});

export const SubmitEmojiOutputSchema = z.object({
  submissionId: z.string(),
  status: z.literal('pending'),
});

// GET /api/communities/:id/emoji/pending
export const ListPendingEmojiInputSchema = z.object({
  communityId: z.string().regex(/^[0-9a-f]{8}$/),
});

export const ListPendingEmojiOutputSchema = z.object({
  submissions: z.array(EmojiSubmissionSchema),
});

// POST /api/communities/:id/emoji/approve
export const ApproveEmojiInputSchema = z.object({
  communityId: z.string().regex(/^[0-9a-f]{8}$/),
  emojiURI: z.string(),
  approve: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const ApproveEmojiOutputSchema = z.object({
  approvalURI: z.string(),
  status: z.enum(['approved', 'rejected']),
});

// POST /api/communities/:id/emoji/revoke
export const RevokeEmojiInputSchema = z.object({
  communityId: z.string().regex(/^[0-9a-f]{8}$/),
  shortcode: z.string(),
  reason: z.string().max(500).optional(),
});

export const RevokeEmojiOutputSchema = z.object({
  success: z.boolean(),
});

// GET /api/communities/:id/emoji/registry
export const GetEmojiRegistryInputSchema = z.object({
  communityId: z.string().regex(/^[0-9a-f]{8}$/),
});

export const GetEmojiRegistryOutputSchema = z.object({
  emoji: z.record(z.string(), EmojiMetadataSchema), // Map<shortcode, metadata>
});

// ============================================================================
// Reaction Schemas
// ============================================================================

// EmojiReference - discriminated union for Unicode or custom emojis
export const EmojiReferenceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('unicode'),
    value: z.string().regex(/^U\+[0-9A-F]{4,6}$/, 'Invalid Unicode codepoint'),
  }),
  z.object({
    type: z.literal('custom'),
    value: z.string().regex(/^at:\/\//, 'Custom emoji must be AT URI'),
  }),
]);

// POST /api/reactions/add
export const AddReactionInputSchema = z.object({
  postUri: z.string().regex(/^at:\/\//, 'postUri must be AT URI'),
  emoji: EmojiReferenceSchema,
});

export const AddReactionOutputSchema = z.object({
  success: z.boolean(),
  reactionUri: z.string(),
});

// DELETE /api/reactions/remove
export const RemoveReactionInputSchema = z.object({
  reactionUri: z.string().regex(/^at:\/\//, 'reactionUri must be AT URI'),
});

export const RemoveReactionOutputSchema = z.object({
  success: z.boolean(),
});

// GET /api/reactions/list
export const ListReactionsInputSchema = z.object({
  postUri: z.string().regex(/^at:\/\//, 'postUri must be AT URI'),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export const ReactionAggregateSchema = z.object({
  emoji: EmojiReferenceSchema,
  count: z.number().int().min(1),
  reactors: z.array(z.string()), // DIDs
  currentUserReacted: z.boolean(),
});

export const ListReactionsOutputSchema = z.object({
  reactions: z.array(ReactionAggregateSchema),
  cursor: z.string().optional(),
});

// ============================================================================
// Hierarchical Group Schemas (017-1-1, T032)
// ============================================================================

// FeedMixConfig - content mixing ratios
export const FeedMixConfigSchema = z
  .object({
    own: z.number().int().min(0).max(100), // Percentage from own group
    parent: z.number().int().min(0).max(100), // Percentage from parent
    global: z.number().int().min(0).max(100), // Percentage from global Bluesky
  })
  .refine(
    (data) => data.own + data.parent + data.global === 100,
    'Feed mix ratios must sum to 100'
  );

// POST /api/communities/:id/children (createChild)
export const CreateChildInputSchema = z.object({
  parentId: z.string().min(1), // Parent group ID (must be Graduated stage)
  name: z.string().min(1).max(200), // Child theme name
  description: z.string().max(2000).optional(), // Optional description
  feedMix: FeedMixConfigSchema.optional(), // Optional feed mix ratios
});

// POST /api/communities/:id/upgrade (upgradeStage)
export const UpgradeStageInputSchema = z.object({
  groupId: z.string().min(1), // Group to upgrade
  targetStage: z.enum(['community', 'graduated']), // Desired stage
});

// POST /api/communities/:id/downgrade (downgradeStage)
export const DowngradeStageInputSchema = z.object({
  groupId: z.string().min(1), // Group to downgrade
  targetStage: z.enum(['theme', 'community']), // Desired lower stage
});

// GET /api/communities/:id/children (listChildren)
export const ListChildrenInputSchema = z.object({
  parentId: z.string().min(1), // Parent group ID
  limit: z.number().int().min(1).max(100).optional().default(50), // Max results
  cursor: z.string().optional(), // Pagination cursor
});

// GET /api/communities/:id/parent (getParent)
export const GetParentInputSchema = z.object({
  childId: z.string().min(1), // Child group ID
});

// Extended GroupResponse with hierarchy fields
export const GroupResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  stage: z.enum(['theme', 'community', 'graduated']),
  hashtag: z.string(),
  parentGroup: z.string().optional(), // AT-URI of parent group
  children: z.array(z.string()).optional(), // Array of child IDs
  memberCount: z.number().int().min(0),
  postCount: z.number().int().min(0),
  feedMix: FeedMixConfigSchema.optional(),
  createdAt: z.number(), // Unix timestamp (seconds)
  updatedAt: z.number().optional(), // Unix timestamp (seconds)
});

// List children response
export const ListChildrenResponseSchema = z.object({
  children: z.array(GroupResponseSchema),
  cursor: z.string().optional(), // Next page cursor
});

// Delete response
export const DeleteResponseSchema = z.object({
  success: z.boolean(),
  deletedId: z.string(),
});
