// Atrarium API Contracts - TypeScript Types
// Shared types for oRPC router

import type { z } from 'zod';
import type {
  ApproveJoinRequestInputSchema,
  BlockUserInputSchema,
  CommunityListOutputSchema,
  CommunityOutputSchema,
  CreateCommunitySchema,
  FeedListOutputSchema,
  FeedOutputSchema,
  GetCommunityInputSchema,
  GetFeedInputSchema,
  GetMembershipInputSchema,
  HidePostInputSchema,
  JoinCommunityInputSchema,
  JoinRequestListOutputSchema,
  JoinRequestOutputSchema,
  LeaveCommunityInputSchema,
  ListFeedsInputSchema,
  ListJoinRequestsInputSchema,
  ListMembershipsInputSchema,
  MembershipListOutputSchema,
  MembershipOutputSchema,
  ModerationActionListOutputSchema,
  ModerationActionOutputSchema,
  RejectJoinRequestInputSchema,
  UnblockUserInputSchema,
  UnhidePostInputSchema,
  UpdateMembershipInputSchema,
} from './schemas';

// ============================================================================
// Community Types
// ============================================================================

export type CreateCommunityInput = z.infer<typeof CreateCommunitySchema>;
export type CommunityOutput = z.infer<typeof CommunityOutputSchema>;
export type CommunityListOutput = z.infer<typeof CommunityListOutputSchema>;
export type GetCommunityInput = z.infer<typeof GetCommunityInputSchema>;

// ============================================================================
// Membership Types
// ============================================================================

export type ListMembershipsInput = z.infer<typeof ListMembershipsInputSchema>;
export type GetMembershipInput = z.infer<typeof GetMembershipInputSchema>;
export type JoinCommunityInput = z.infer<typeof JoinCommunityInputSchema>;
export type LeaveCommunityInput = z.infer<typeof LeaveCommunityInputSchema>;
export type UpdateMembershipInput = z.infer<typeof UpdateMembershipInputSchema>;
export type MembershipOutput = z.infer<typeof MembershipOutputSchema>;
export type MembershipListOutput = z.infer<typeof MembershipListOutputSchema>;

// ============================================================================
// Join Request Types
// ============================================================================

export type ListJoinRequestsInput = z.infer<typeof ListJoinRequestsInputSchema>;
export type ApproveJoinRequestInput = z.infer<typeof ApproveJoinRequestInputSchema>;
export type RejectJoinRequestInput = z.infer<typeof RejectJoinRequestInputSchema>;
export type JoinRequestOutput = z.infer<typeof JoinRequestOutputSchema>;
export type JoinRequestListOutput = z.infer<typeof JoinRequestListOutputSchema>;

// ============================================================================
// Moderation Types
// ============================================================================

export type HidePostInput = z.infer<typeof HidePostInputSchema>;
export type UnhidePostInput = z.infer<typeof UnhidePostInputSchema>;
export type BlockUserInput = z.infer<typeof BlockUserInputSchema>;
export type UnblockUserInput = z.infer<typeof UnblockUserInputSchema>;
export type ModerationActionOutput = z.infer<typeof ModerationActionOutputSchema>;
export type ModerationActionListOutput = z.infer<typeof ModerationActionListOutputSchema>;

// ============================================================================
// Feed Types
// ============================================================================

export type ListFeedsInput = z.infer<typeof ListFeedsInputSchema>;
export type GetFeedInput = z.infer<typeof GetFeedInputSchema>;
export type FeedOutput = z.infer<typeof FeedOutputSchema>;
export type FeedListOutput = z.infer<typeof FeedListOutputSchema>;
