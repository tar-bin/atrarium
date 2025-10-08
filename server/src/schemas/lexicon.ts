// Atrarium PDS-First Architecture - Lexicon Schema Validation
// TypeScript types and Zod schemas for AT Protocol Lexicon records

import { z } from 'zod';

// ============================================================================
// AT Protocol Lexicon Type Definitions
// ============================================================================

/**
 * Community configuration record (stored in owner's PDS)
 * Lexicon: net.atrarium.community.config
 */
export interface CommunityConfig {
  $type: 'net.atrarium.community.config';
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
 * Lexicon: net.atrarium.community.membership
 */
export interface MembershipRecord {
  $type: 'net.atrarium.community.membership';
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
  $type: z.literal('net.atrarium.community.config'),
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
  $type: z.literal('net.atrarium.community.membership'),
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
