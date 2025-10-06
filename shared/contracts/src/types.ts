// Atrarium API Contracts - TypeScript Types
// Shared types for oRPC router

import type { z } from 'zod';
import type {
  CreateCommunitySchema,
  CommunityOutputSchema,
  CommunityListOutputSchema,
  GetCommunityInputSchema,
} from './schemas';

// ============================================================================
// Community Types
// ============================================================================

export type CreateCommunityInput = z.infer<typeof CreateCommunitySchema>;
export type CommunityOutput = z.infer<typeof CommunityOutputSchema>;
export type CommunityListOutput = z.infer<typeof CommunityListOutputSchema>;
export type GetCommunityInput = z.infer<typeof GetCommunityInputSchema>;
