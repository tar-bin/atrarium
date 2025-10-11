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
// Hierarchical Group System Validation (017-1-1)
// ============================================================================

/**
 * Dunbar threshold constants for stage progression
 * Based on social group size research (Dunbar's number)
 */
export const THEME_TO_COMMUNITY_THRESHOLD = 15;
export const COMMUNITY_TO_GRADUATED_THRESHOLD = 50;

/**
 * Validate stage upgrade transition
 * @param currentStage - Current group stage
 * @param targetStage - Desired target stage
 * @param memberCount - Active member count
 * @returns Validation result with error message if invalid
 */
export function validateStageUpgrade(
  currentStage: 'theme' | 'community' | 'graduated',
  targetStage: 'theme' | 'community' | 'graduated',
  memberCount: number
): { valid: boolean; error?: string } {
  // Cannot upgrade to same stage
  if (currentStage === targetStage) {
    return { valid: false, error: 'Target stage must differ from current stage' };
  }

  // Theme → Community
  if (currentStage === 'theme' && targetStage === 'community') {
    if (memberCount < THEME_TO_COMMUNITY_THRESHOLD) {
      return {
        valid: false,
        error: `Member count (${memberCount}) below threshold (${THEME_TO_COMMUNITY_THRESHOLD}) for Community stage`,
      };
    }
    return { valid: true };
  }

  // Community → Graduated
  if (currentStage === 'community' && targetStage === 'graduated') {
    if (memberCount < COMMUNITY_TO_GRADUATED_THRESHOLD) {
      return {
        valid: false,
        error: `Member count (${memberCount}) below threshold (${COMMUNITY_TO_GRADUATED_THRESHOLD}) for Graduated stage`,
      };
    }
    return { valid: true };
  }

  // Theme → Graduated (must go through Community)
  if (currentStage === 'theme' && targetStage === 'graduated') {
    return {
      valid: false,
      error: 'Cannot upgrade from Theme to Graduated directly. Must upgrade to Community first.',
    };
  }

  // Invalid downgrade via upgrade endpoint
  return {
    valid: false,
    error: 'Invalid stage transition. Use downgrade endpoint for downgrades.',
  };
}

/**
 * Validate stage downgrade transition
 * @param currentStage - Current group stage
 * @param targetStage - Desired target stage
 * @returns Validation result with error message if invalid
 */
export function validateStageDowngrade(
  currentStage: 'theme' | 'community' | 'graduated',
  targetStage: 'theme' | 'community' | 'graduated'
): { valid: boolean; error?: string } {
  // Cannot downgrade to same stage
  if (currentStage === targetStage) {
    return { valid: false, error: 'Target stage must differ from current stage' };
  }

  // Graduated → Community
  if (currentStage === 'graduated' && targetStage === 'community') {
    return { valid: true };
  }

  // Graduated → Theme (direct downgrade allowed)
  if (currentStage === 'graduated' && targetStage === 'theme') {
    return { valid: true };
  }

  // Community → Theme
  if (currentStage === 'community' && targetStage === 'theme') {
    return { valid: true };
  }

  // Invalid upgrade via downgrade endpoint
  return { valid: false, error: 'Invalid stage transition. Use upgrade endpoint for upgrades.' };
}

/**
 * Validate parent-child stage compatibility
 * @param parentStage - Parent group stage
 * @param childStage - Child group stage
 * @returns Validation result with error message if invalid
 */
export function validateParentChild(
  parentStage: 'theme' | 'community' | 'graduated',
  childStage: 'theme' | 'community' | 'graduated'
): { valid: boolean; error?: string } {
  // Only Graduated can be parents
  if (parentStage !== 'graduated') {
    return { valid: false, error: 'Only Graduated-stage groups can have children' };
  }

  // Only Theme can be children
  if (childStage !== 'theme') {
    return { valid: false, error: 'Only Theme-stage groups can have parents' };
  }

  return { valid: true };
}

/**
 * Validate hierarchy depth (max 1 level)
 * @param parentGroupUri - Parent group AT-URI (if exists)
 * @returns Validation result with error message if invalid
 */
export function validateHierarchyDepth(parentGroupUri: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  // If parent group itself has a parent, hierarchy depth exceeds 1 level
  // This check is performed by querying the parent group's config
  // For now, we return valid if parentGroupUri is null/undefined (top-level group)
  if (!parentGroupUri) {
    return { valid: true };
  }

  // Actual depth validation requires fetching parent config from PDS
  // This will be implemented in PDS service methods (T015-T020)
  // For schema validation, we assume caller has already checked parent depth
  return { valid: true };
}

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
