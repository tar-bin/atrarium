// Atrarium MVP - Validation Schemas
// Zod schemas for request/response validation

import { z } from 'zod';
import { MODERATION_REASONS } from '../types';

// ============================================================================
// Auth Schemas
// ============================================================================

export const LoginRequestSchema = z.object({
  handle: z.string().min(1).max(100),
});

// ============================================================================
// Community Schemas
// ============================================================================

export const CreateCommunitySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  parentId: z.string().uuid().optional(),
});

export const UpdateCommunitySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).nullable().optional(),
  feedMixOwn: z.number().min(0).max(1).optional(),
  feedMixParent: z.number().min(0).max(1).optional(),
  feedMixGlobal: z.number().min(0).max(1).optional(),
});

export const TransitionStageSchema = z.object({
  stage: z.enum(['theme', 'community', 'graduated']),
});

// ============================================================================
// Theme Feed Schemas
// ============================================================================

export const CreateThemeFeedSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

export const UpdateThemeFeedSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).nullable().optional(),
});

// ============================================================================
// Post Schemas
// ============================================================================

export const SubmitPostSchema = z.object({
  uri: z
    .string()
    .regex(/^at:\/\/did:(plc|web):[a-z0-9._:-]+\/app\.bsky\.feed\.post\/[a-zA-Z0-9]+$/, {
      message: 'Invalid AT-URI format',
    }),
  feedId: z.string().uuid(),
});

// ============================================================================
// Membership Schemas
// ============================================================================

export const UpdateRoleSchema = z.object({
  role: z.enum(['owner', 'moderator', 'member']),
});

// ============================================================================
// Moderation Schemas (007-reason-enum-atproto)
// ============================================================================

export const moderationReasonSchema = z.enum(MODERATION_REASONS).optional();

export const moderationActionSchema = z.object({
  action: z.enum(['hide_post', 'unhide_post', 'block_user', 'unblock_user']),
  target: z.string(), // AT-URI or DID
  community: z.string().startsWith('at://'), // AT-URI
  reason: moderationReasonSchema,
  createdAt: z.string().datetime(),
});

// ============================================================================
// Feed Generator Schemas (AT Protocol)
// ============================================================================

export const GetFeedSkeletonParamsSchema = z.object({
  feed: z
    .string()
    .regex(/^at:\/\/did:(web|plc):[a-z0-9._:-]+\/app\.bsky\.feed\.generator\/[a-zA-Z0-9._-]+$/, {
      message: 'Invalid feed URI',
    }),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

// ============================================================================
// Validation Helper
// ============================================================================

// ============================================================================
// Reaction Schemas
// ============================================================================

/**
 * EmojiReference - discriminated union for Unicode or custom emojis
 */
export const EmojiReferenceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('unicode'),
    value: z
      .string()
      .regex(/^U\+[0-9A-F]{4,6}$/, 'Invalid Unicode codepoint format (expected U+XXXX)'),
  }),
  z.object({
    type: z.literal('custom'),
    value: z.string().regex(/^at:\/\//, 'Custom emoji value must be an AT URI'),
  }),
]);

/**
 * Reaction record validation
 */
export const ReactionSchema = z.object({
  postUri: z.string().regex(/^at:\/\//, 'postUri must be a valid AT URI'),
  emoji: EmojiReferenceSchema,
  communityId: z.string().regex(/^[0-9a-f]{8}$/, 'communityId must be 8-character hex'),
  createdAt: z.string().datetime(),
});

/**
 * Add reaction request
 */
export const AddReactionRequestSchema = z.object({
  postUri: z.string().regex(/^at:\/\//, 'postUri must be a valid AT URI'),
  emoji: EmojiReferenceSchema,
});

/**
 * Remove reaction request
 */
export const RemoveReactionRequestSchema = z.object({
  reactionUri: z.string().regex(/^at:\/\//, 'reactionUri must be a valid AT URI'),
});

/**
 * List reactions request
 */
export const ListReactionsRequestSchema = z.object({
  postUri: z.string().regex(/^at:\/\//, 'postUri must be a valid AT URI'),
  limit: z.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Validate request body against schema
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: messages };
    }
    return { success: false, error: 'Validation failed' };
  }
}
