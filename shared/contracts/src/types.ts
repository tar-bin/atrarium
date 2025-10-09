// Atrarium API Contracts - TypeScript Types
// Shared types for oRPC router

import type { z } from 'zod';
import type {
  // T034: Emoji schemas
  ApproveEmojiInputSchema,
  ApproveEmojiOutputSchema,
  ApproveJoinRequestInputSchema,
  BlobRefSchema,
  BlockUserInputSchema,
  CommunityListOutputSchema,
  CommunityOutputSchema,
  CreateCommunitySchema,
  CustomEmojiSchema,
  EmojiApprovalSchema,
  EmojiMetadataSchema,
  EmojiSubmissionSchema,
  FeedListOutputSchema,
  FeedOutputSchema,
  GetCommunityInputSchema,
  GetEmojiRegistryInputSchema,
  GetEmojiRegistryOutputSchema,
  GetFeedInputSchema,
  GetMembershipInputSchema,
  HidePostInputSchema,
  JoinCommunityInputSchema,
  JoinRequestListOutputSchema,
  JoinRequestOutputSchema,
  LeaveCommunityInputSchema,
  ListEmojiInputSchema,
  ListEmojiOutputSchema,
  ListFeedsInputSchema,
  ListJoinRequestsInputSchema,
  ListMembershipsInputSchema,
  ListPendingEmojiInputSchema,
  ListPendingEmojiOutputSchema,
  MembershipListOutputSchema,
  MembershipOutputSchema,
  ModerationActionListOutputSchema,
  ModerationActionOutputSchema,
  RejectJoinRequestInputSchema,
  RevokeEmojiInputSchema,
  RevokeEmojiOutputSchema,
  SubmitEmojiInputSchema,
  SubmitEmojiOutputSchema,
  UnblockUserInputSchema,
  UnhidePostInputSchema,
  UpdateMembershipInputSchema,
  UploadEmojiInputSchema,
  UploadEmojiOutputSchema,
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

// ============================================================================
// Emoji Types (T034 - 015-markdown-pds)
// ============================================================================

export type BlobRef = z.infer<typeof BlobRefSchema>;
export type CustomEmoji = z.infer<typeof CustomEmojiSchema>;
export type EmojiApproval = z.infer<typeof EmojiApprovalSchema>;
export type EmojiSubmission = z.infer<typeof EmojiSubmissionSchema>;
export type EmojiMetadata = z.infer<typeof EmojiMetadataSchema>;

// Emoji API Input/Output Types
export type UploadEmojiInput = z.infer<typeof UploadEmojiInputSchema>;
export type UploadEmojiOutput = z.infer<typeof UploadEmojiOutputSchema>;
export type ListEmojiInput = z.infer<typeof ListEmojiInputSchema>;
export type ListEmojiOutput = z.infer<typeof ListEmojiOutputSchema>;
export type SubmitEmojiInput = z.infer<typeof SubmitEmojiInputSchema>;
export type SubmitEmojiOutput = z.infer<typeof SubmitEmojiOutputSchema>;
export type ListPendingEmojiInput = z.infer<typeof ListPendingEmojiInputSchema>;
export type ListPendingEmojiOutput = z.infer<typeof ListPendingEmojiOutputSchema>;
export type ApproveEmojiInput = z.infer<typeof ApproveEmojiInputSchema>;
export type ApproveEmojiOutput = z.infer<typeof ApproveEmojiOutputSchema>;
export type RevokeEmojiInput = z.infer<typeof RevokeEmojiInputSchema>;
export type RevokeEmojiOutput = z.infer<typeof RevokeEmojiOutputSchema>;
export type GetEmojiRegistryInput = z.infer<typeof GetEmojiRegistryInputSchema>;
export type GetEmojiRegistryOutput = z.infer<typeof GetEmojiRegistryOutputSchema>;
