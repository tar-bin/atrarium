// Atrarium MVP - Validation Schemas
// Zod schemas for request/response validation

import { z } from 'zod';

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
      const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: messages };
    }
    return { success: false, error: 'Validation failed' };
  }
}
