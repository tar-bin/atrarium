// Atrarium PDS-First Architecture - Lexicon Schema Validation
// TypeScript types and Zod schemas for AT Protocol Lexicon records

import { z } from 'zod';

// ============================================================================
// AT Protocol Lexicon Type Definitions
// ============================================================================

/**
 * Community configuration record (stored in owner's PDS)
 * Lexicon: net.atrarium.group.config
 */
export interface CommunityConfig {
  $type: 'net.atrarium.group.config';
  name: string;
  description?: string;
  hashtag: string; // Format: #atrarium_[8-hex]
  stage: 'theme' | 'community' | 'graduated';
  accessType: 'open' | 'invite-only'; // NEW (T005)
  moderators?: string[]; // Array of moderator DIDs
  blocklist?: string[]; // Array of blocked user DIDs
  feedMix?: {
    own: number;
    parent: number;
    global: number;
  };
  parentCommunity?: string; // AT-URI of parent community
  createdAt: string; // ISO 8601 datetime
  updatedAt?: string; // ISO 8601 datetime
}

/**
 * Membership record (stored in member's PDS)
 * Lexicon: net.atrarium.group.membership
 */
export interface MembershipRecord {
  $type: 'net.atrarium.group.membership';
  community: string; // AT-URI of CommunityConfig
  role: 'owner' | 'moderator' | 'member';
  status: 'active' | 'pending'; // NEW (T004)
  joinedAt: string; // ISO 8601 datetime
  active: boolean;
  invitedBy?: string; // DID of inviter
  customTitle?: string; // Custom role title
}

/**
 * Moderation action record (stored in moderator's PDS)
 * Lexicon: net.atrarium.moderation.action
 */
export interface ModerationAction {
  $type: 'net.atrarium.moderation.action';
  action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user';
  target: PostTarget | UserTarget;
  community: string; // AT-URI of CommunityConfig
  reason?: string;
  createdAt: string; // ISO 8601 datetime
}

export interface PostTarget {
  uri: string; // AT-URI of post
  cid: string; // Content identifier
}

export interface UserTarget {
  did: string; // User DID
}

/**
 * Community post record (stored in user's PDS)
 * Lexicon: net.atrarium.group.post
 * Feature: 014-bluesky (Custom Lexicon Posts)
 * Feature: 015-markdown-pds (Markdown + Emoji support)
 */
export interface CommunityPost {
  $type: 'net.atrarium.group.post';
  text: string; // Post text content (max 300 graphemes)
  markdown?: string; // Optional Markdown-formatted content (015-markdown-pds)
  emojiShortcodes?: string[]; // Optional emoji shortcodes used in post (015-markdown-pds)
  communityId: string; // 8-character hex (immutable across stages)
  createdAt: string; // ISO 8601 datetime
}

/**
 * Custom emoji record (stored in user's PDS)
 * Lexicon: net.atrarium.emoji.custom
 * Feature: 015-markdown-pds
 */
export interface CustomEmoji {
  $type: 'net.atrarium.emoji.custom';
  shortcode: string; // Emoji shortcode (e.g., 'my_emoji' for :my_emoji:)
  blob: BlobRef; // Emoji image blob reference
  creator: string; // DID of uploader
  uploadedAt: string; // ISO 8601 datetime
  format: 'png' | 'gif' | 'webp'; // Image format
  size: number; // File size in bytes (≤500KB)
  dimensions: { width: number; height: number }; // Image dimensions (≤256×256px)
  animated: boolean; // True for animated GIFs
}

/**
 * Emoji approval record (stored in community owner's PDS)
 * Lexicon: net.atrarium.emoji.approval
 * Feature: 015-markdown-pds
 */
export interface EmojiApproval {
  $type: 'net.atrarium.emoji.approval';
  shortcode: string; // Registered shortcode in community namespace
  emojiRef: string; // AT-URI of CustomEmoji
  communityId: string; // Community ID (8-character hex)
  status: 'approved' | 'rejected' | 'revoked'; // Approval status
  approver: string; // DID of community owner who made decision
  decidedAt: string; // ISO 8601 datetime
  reason?: string; // Optional rejection/revocation reason
}

/**
 * AT Protocol blob reference
 */
export interface BlobRef {
  $type: 'blob';
  ref: { $link: string }; // CID reference
  mimeType: string; // MIME type (image/png, image/gif, image/webp)
  size: number; // File size in bytes
}

/**
 * Emoji reference (discriminated union for Unicode or custom emoji)
 * Feature: 016-slack-mastodon-misskey
 */
export type EmojiReference =
  | {
      type: 'unicode';
      value: string; // Unicode codepoint (e.g., U+1F44D)
    }
  | {
      type: 'custom';
      value: string; // AT-URI of CustomEmoji
    };

/**
 * Reaction record (stored in user's PDS)
 * Lexicon: net.atrarium.group.reaction
 * Feature: 016-slack-mastodon-misskey
 */
export interface Reaction {
  $type: 'net.atrarium.group.reaction';
  postUri: string; // AT-URI of post being reacted to
  emoji: EmojiReference; // Emoji (Unicode or custom)
  communityId: string; // Community ID (8-character hex)
  createdAt: string; // ISO 8601 datetime
}

/**
 * PDS record creation result
 */
export interface PDSRecordResult {
  uri: string; // AT-URI of created record
  cid: string; // Content identifier
  rkey: string; // Record key (tid)
}

/**
 * PDS record with metadata
 */
export interface PDSRecordWithMetadata<T> extends PDSRecordResult {
  value: T; // Record data
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

/**
 * DID validation (format: did:plc:xxxxx or did:web:xxxxx)
 */
const didSchema = z.string().regex(/^did:(plc|web):[a-z0-9]+$/i, 'Invalid DID format');

/**
 * AT-URI validation (format: at://did:plc:xxx/collection/rkey)
 */
const atUriSchema = z
  .string()
  .regex(/^at:\/\/did:(plc|web):[a-z0-9]+\/[a-z0-9.]+\/[a-z0-9]+$/i, 'Invalid AT-URI format');

/**
 * Hashtag validation (format: #atr_[8-hex])
 */
const hashtagSchema = z
  .string()
  .regex(/^#atr_[0-9a-f]{8}$/, 'Hashtag must match pattern #atr_[8-hex]');

/**
 * ISO 8601 datetime validation
 */
const iso8601Schema = z.string().datetime({ message: 'Must be valid ISO 8601 datetime' });

/**
 * FeedMix validation (must sum to 1.0)
 */
const feedMixSchema = z
  .object({
    own: z.number().min(0).max(1),
    parent: z.number().min(0).max(1),
    global: z.number().min(0).max(1),
  })
  .refine((data) => Math.abs(data.own + data.parent + data.global - 1.0) < 0.001, {
    message: 'feedMix ratios must sum to 1.0',
  });

/**
 * CommunityConfig validation schema
 */
export const communityConfigSchema = z.object({
  $type: z.literal('net.atrarium.group.config'),
  name: z.string().min(1).max(100, 'name must not exceed 100 graphemes'),
  description: z.string().max(1000, 'description must not exceed 1000 graphemes').optional(),
  hashtag: hashtagSchema,
  stage: z.enum(['theme', 'community', 'graduated']),
  accessType: z.enum(['open', 'invite-only']).default('open'), // NEW (T005)
  moderators: z.array(didSchema).max(50, 'moderators array maxLength is 50').optional(),
  blocklist: z.array(didSchema).max(1000, 'blocklist array maxLength is 1000').optional(),
  feedMix: feedMixSchema.optional(),
  parentCommunity: atUriSchema.optional(),
  createdAt: iso8601Schema,
  updatedAt: iso8601Schema.optional(),
});

/**
 * MembershipRecord validation schema
 */
export const membershipRecordSchema = z.object({
  $type: z.literal('net.atrarium.group.membership'),
  community: atUriSchema,
  role: z.enum(['owner', 'moderator', 'member']),
  status: z.enum(['active', 'pending']).default('active'), // NEW (T004)
  joinedAt: iso8601Schema,
  active: z.boolean().default(true),
  invitedBy: didSchema.optional(),
  customTitle: z.string().max(50, 'customTitle must not exceed 50 graphemes').optional(),
});

/**
 * PostTarget validation schema
 */
const postTargetSchema = z.object({
  uri: atUriSchema,
  cid: z.string().min(1, 'cid is required'),
});

/**
 * UserTarget validation schema
 */
const userTargetSchema = z.object({
  did: didSchema,
});

/**
 * ModerationAction validation schema
 */
export const moderationActionSchema = z.object({
  $type: z.literal('net.atrarium.moderation.action'),
  action: z.enum(['hide_post', 'unhide_post', 'block_user', 'unblock_user']),
  target: z.union([postTargetSchema, userTargetSchema]),
  community: atUriSchema,
  reason: z.string().max(2000, 'reason must not exceed 2000 graphemes').optional(),
  createdAt: iso8601Schema,
});

/**
 * CommunityPost validation schema (014-bluesky, 015-markdown-pds)
 */
export const communityPostSchema = z.object({
  $type: z.literal('net.atrarium.group.post'),
  text: z.string().min(1, 'text must not be empty').max(300, 'text must not exceed 300 graphemes'),
  markdown: z.string().max(300, 'markdown must not exceed 300 graphemes').optional(),
  emojiShortcodes: z
    .array(
      z
        .string()
        .regex(/^[a-z0-9_]+$/, 'emoji shortcode must be lowercase alphanumeric with underscores')
    )
    .max(20, 'emojiShortcodes must not exceed 20 items')
    .optional(),
  communityId: z
    .string()
    .length(8, 'communityId must be exactly 8 characters')
    .regex(/^[0-9a-f]{8}$/, 'communityId must be 8-character hex'),
  createdAt: iso8601Schema,
});

/**
 * BlobRef validation schema
 */
const blobRefSchema = z.object({
  $type: z.literal('blob'),
  ref: z.object({ $link: z.string() }),
  mimeType: z.enum(['image/png', 'image/gif', 'image/webp']),
  size: z.number().int().min(1).max(512000), // Max 500KB
});

/**
 * CustomEmoji validation schema (015-markdown-pds)
 */
export const customEmojiSchema = z.object({
  $type: z.literal('net.atrarium.emoji.custom'),
  shortcode: z
    .string()
    .min(2, 'shortcode must be at least 2 characters')
    .max(32, 'shortcode must not exceed 32 characters')
    .regex(/^[a-z0-9_]+$/, 'shortcode must be lowercase alphanumeric with underscores'),
  blob: blobRefSchema,
  creator: didSchema,
  uploadedAt: iso8601Schema,
  format: z.enum(['png', 'gif', 'webp']),
  size: z.number().int().min(1).max(512000), // Max 500KB
  dimensions: z.object({
    width: z.number().int().min(1).max(256),
    height: z.number().int().min(1).max(256),
  }),
  animated: z.boolean(),
});

/**
 * EmojiApproval validation schema (015-markdown-pds)
 */
export const emojiApprovalSchema = z.object({
  $type: z.literal('net.atrarium.emoji.approval'),
  shortcode: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_]+$/),
  emojiRef: atUriSchema,
  communityId: z
    .string()
    .length(8)
    .regex(/^[0-9a-f]{8}$/),
  status: z.enum(['approved', 'rejected', 'revoked']),
  approver: didSchema,
  decidedAt: iso8601Schema,
  reason: z.string().max(250, 'reason must not exceed 250 graphemes').optional(),
});

/**
 * EmojiReference validation schema (016-slack-mastodon-misskey)
 */
export const emojiReferenceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('unicode'),
    value: z.string().regex(/^U\+[0-9A-F]{4,6}$/, 'Unicode codepoint must be in format U+XXXX'),
  }),
  z.object({
    type: z.literal('custom'),
    value: atUriSchema,
  }),
]);

/**
 * Reaction validation schema (016-slack-mastodon-misskey)
 */
export const reactionSchema = z.object({
  $type: z.literal('net.atrarium.group.reaction'),
  postUri: atUriSchema,
  emoji: emojiReferenceSchema,
  communityId: z
    .string()
    .length(8, 'communityId must be exactly 8 characters')
    .regex(/^[0-9a-f]{8}$/, 'communityId must be 8-character hex'),
  createdAt: iso8601Schema,
});

// ============================================================================
// Hierarchical Group System Types and Validation (017-1-1)
// ============================================================================

/**
 * Parent-child relationship validation
 * Ensures AT-URI format and stage compatibility
 */
export interface ParentChildRelationship {
  parentUri: string; // AT-URI of parent group config
  parentStage: 'graduated'; // Only Graduated can be parents
  childStage: 'theme'; // Only Theme can be children
}

/**
 * Stage-specific rules for hierarchy constraints
 */
export interface GroupStageRules {
  stage: 'theme' | 'community' | 'graduated';
  canHaveParent: boolean; // True for theme, false for community/graduated
  canCreateChildren: boolean; // True for graduated, false for theme/community
  moderationMode: 'inherited' | 'independent'; // inherited for theme, independent for others
}

/**
 * Get stage-specific hierarchy rules
 * @param stage - Group stage
 * @returns Stage rules
 */
export function getStageRules(stage: 'theme' | 'community' | 'graduated'): GroupStageRules {
  switch (stage) {
    case 'theme':
      return {
        stage: 'theme',
        canHaveParent: true,
        canCreateChildren: false,
        moderationMode: 'inherited',
      };
    case 'community':
      return {
        stage: 'community',
        canHaveParent: false,
        canCreateChildren: false,
        moderationMode: 'independent',
      };
    case 'graduated':
      return {
        stage: 'graduated',
        canHaveParent: false,
        canCreateChildren: true,
        moderationMode: 'independent',
      };
  }
}

/**
 * Validate immutable parent reference
 * Ensures parentGroup field never changes after initial creation
 * @param existingParent - Existing parent AT-URI (from PDS)
 * @param newParent - New parent AT-URI (from update request)
 * @returns Validation result
 */
export function validateImmutableParent(
  existingParent: string | null | undefined,
  newParent: string | null | undefined
): { valid: boolean; error?: string } {
  // If both are null/undefined, no parent exists (valid)
  if (!existingParent && !newParent) {
    return { valid: true };
  }

  // If existing parent is null but new parent is set, this is initial creation (valid)
  if (!existingParent && newParent) {
    return { valid: true };
  }

  // If existing parent exists and new parent is different, immutability violated
  if (existingParent && newParent !== existingParent) {
    return {
      valid: false,
      error: `Parent reference is immutable. Existing parent: ${existingParent}, attempted change to: ${newParent}`,
    };
  }

  // Parent unchanged (valid)
  return { valid: true };
}

/**
 * Validate parent-child relationship
 * Ensures AT-URI format, stage compatibility, and Lexicon constraints
 * @param parentConfig - Parent group config
 * @param childStage - Child group stage
 * @returns Validation result
 */
export function validateParentChildRelationship(
  parentConfig: CommunityConfig,
  childStage: 'theme' | 'community' | 'graduated'
): { valid: boolean; error?: string } {
  // Validate parent stage (must be Graduated)
  if (parentConfig.stage !== 'graduated') {
    return {
      valid: false,
      error: `Only Graduated-stage groups can be parents. Parent stage: ${parentConfig.stage}`,
    };
  }

  // Validate child stage (must be Theme)
  if (childStage !== 'theme') {
    return {
      valid: false,
      error: `Only Theme-stage groups can have parents. Child stage: ${childStage}`,
    };
  }

  // Validate parent cannot have its own parent (max depth 1 level)
  if (parentConfig.parentCommunity) {
    return {
      valid: false,
      error: 'Parent group cannot have its own parent (max hierarchy depth is 1 level)',
    };
  }

  return { valid: true };
}

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate CommunityConfig record
 * @throws {z.ZodError} if validation fails
 */
export function validateCommunityConfig(data: unknown): CommunityConfig {
  return communityConfigSchema.parse(data);
}

/**
 * Validate MembershipRecord record
 * @throws {z.ZodError} if validation fails
 */
export function validateMembershipRecord(data: unknown): MembershipRecord {
  return membershipRecordSchema.parse(data);
}

/**
 * Validate ModerationAction record
 * @throws {z.ZodError} if validation fails
 */
export function validateModerationAction(data: unknown): ModerationAction {
  return moderationActionSchema.parse(data);
}

/**
 * Validate CommunityPost record (014-bluesky, 015-markdown-pds)
 * @throws {z.ZodError} if validation fails
 */
export function validateCommunityPost(data: unknown): CommunityPost {
  return communityPostSchema.parse(data);
}

/**
 * Validate CustomEmoji record (015-markdown-pds)
 * @throws {z.ZodError} if validation fails
 */
export function validateCustomEmoji(data: unknown): CustomEmoji {
  return customEmojiSchema.parse(data);
}

/**
 * Validate EmojiApproval record (015-markdown-pds)
 * @throws {z.ZodError} if validation fails
 */
export function validateEmojiApproval(data: unknown): EmojiApproval {
  return emojiApprovalSchema.parse(data);
}

/**
 * Validate DID format
 * @throws {z.ZodError} if validation fails
 */
export function validateDID(did: string): string {
  return didSchema.parse(did);
}

/**
 * Validate AT-URI format
 * @throws {z.ZodError} if validation fails
 */
export function validateATUri(uri: string): string {
  return atUriSchema.parse(uri);
}

/**
 * Validate Reaction record (016-slack-mastodon-misskey)
 * @throws {z.ZodError} if validation fails
 */
export function validateReaction(data: unknown): Reaction {
  return reactionSchema.parse(data);
}
