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
