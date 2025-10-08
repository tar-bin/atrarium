// Atrarium API Contracts - oRPC Router Definition
// Type-safe API contract shared between client and server

import { os } from '@orpc/server';
import {
  ApproveJoinRequestInputSchema,
  BlockUserInputSchema,
  CommunityListOutputSchema,
  CommunityOutputSchema,
  CreateCommunitySchema,
  CreatePostInputSchema,
  CreatePostOutputSchema,
  FeedListOutputSchema,
  FeedOutputSchema,
  GetCommunityInputSchema,
  GetFeedInputSchema,
  GetMembershipInputSchema,
  GetPostInputSchema,
  GetPostsInputSchema,
  HidePostInputSchema,
  JoinCommunityInputSchema,
  JoinRequestListOutputSchema,
  LeaveCommunityInputSchema,
  ListFeedsInputSchema,
  ListJoinRequestsInputSchema,
  ListMembershipsInputSchema,
  MembershipListOutputSchema,
  MembershipOutputSchema,
  ModerationActionListOutputSchema,
  ModerationActionOutputSchema,
  PostListOutputSchema,
  PostOutputSchema,
  RejectJoinRequestInputSchema,
  UnblockUserInputSchema,
  UnhidePostInputSchema,
  UpdateMembershipInputSchema,
} from './schemas';

// ============================================================================
// Context Definition
// ============================================================================

export interface Context {
  env?: any; // Server-side only, typed as any for client compatibility
  userDid?: string;
}

// Base procedure with context
const pub = os.$context<Context>();

// Authenticated procedures (middleware defined here, handlers on server)
export const authed = pub.use(({ context, next }) => {
  // Note: This middleware is only enforced on the server
  // Client-side only uses this for type information
  if (!context.userDid) {
    throw new Error('UNAUTHORIZED: Missing or invalid authentication');
  }
  return next({ context });
});

// ============================================================================
// Communities Router Contract
// ============================================================================

export const communitiesContract = {
  list: authed
    .route({
      method: 'GET',
      path: '/api/communities',
    })
    .output(CommunityListOutputSchema),

  create: authed
    .route({
      method: 'POST',
      path: '/api/communities',
    })
    .input(CreateCommunitySchema)
    .output(CommunityOutputSchema),

  get: authed
    .route({
      method: 'GET',
      path: '/api/communities/:id',
    })
    .input(GetCommunityInputSchema)
    .output(CommunityOutputSchema),
};

// ============================================================================
// Memberships Router Contract
// ============================================================================

export const membershipsContract = {
  list: authed
    .route({
      method: 'GET',
      path: '/api/memberships',
    })
    .input(ListMembershipsInputSchema)
    .output(MembershipListOutputSchema),

  get: authed
    .route({
      method: 'GET',
      path: '/api/memberships/:uri',
    })
    .input(GetMembershipInputSchema)
    .output(MembershipOutputSchema),

  join: authed
    .route({
      method: 'POST',
      path: '/api/memberships/join',
    })
    .input(JoinCommunityInputSchema)
    .output(MembershipOutputSchema),

  leave: authed
    .route({
      method: 'POST',
      path: '/api/memberships/leave',
    })
    .input(LeaveCommunityInputSchema)
    .output(MembershipOutputSchema),

  update: authed
    .route({
      method: 'PATCH',
      path: '/api/memberships/:uri',
    })
    .input(UpdateMembershipInputSchema)
    .output(MembershipOutputSchema),
};

// ============================================================================
// Join Requests Router Contract
// ============================================================================

export const joinRequestsContract = {
  list: authed
    .route({
      method: 'GET',
      path: '/api/join-requests',
    })
    .input(ListJoinRequestsInputSchema)
    .output(JoinRequestListOutputSchema),

  approve: authed
    .route({
      method: 'POST',
      path: '/api/join-requests/approve',
    })
    .input(ApproveJoinRequestInputSchema)
    .output(MembershipOutputSchema),

  reject: authed
    .route({
      method: 'POST',
      path: '/api/join-requests/reject',
    })
    .input(RejectJoinRequestInputSchema)
    .output(MembershipOutputSchema),
};

// ============================================================================
// Moderation Router Contract
// ============================================================================

export const moderationContract = {
  hidePost: authed
    .route({
      method: 'POST',
      path: '/api/moderation/hide-post',
    })
    .input(HidePostInputSchema)
    .output(ModerationActionOutputSchema),

  unhidePost: authed
    .route({
      method: 'POST',
      path: '/api/moderation/unhide-post',
    })
    .input(UnhidePostInputSchema)
    .output(ModerationActionOutputSchema),

  blockUser: authed
    .route({
      method: 'POST',
      path: '/api/moderation/block-user',
    })
    .input(BlockUserInputSchema)
    .output(ModerationActionOutputSchema),

  unblockUser: authed
    .route({
      method: 'POST',
      path: '/api/moderation/unblock-user',
    })
    .input(UnblockUserInputSchema)
    .output(ModerationActionOutputSchema),

  list: authed
    .route({
      method: 'GET',
      path: '/api/moderation/actions',
    })
    .output(ModerationActionListOutputSchema),
};

// ============================================================================
// Feeds Router Contract
// ============================================================================

export const feedsContract = {
  list: authed
    .route({
      method: 'GET',
      path: '/api/feeds',
    })
    .input(ListFeedsInputSchema)
    .output(FeedListOutputSchema),

  get: authed
    .route({
      method: 'GET',
      path: '/api/feeds/:communityUri',
    })
    .input(GetFeedInputSchema)
    .output(FeedOutputSchema),
};

// ============================================================================
// Posts Router Contract (014-bluesky: Custom Lexicon Posts)
// ============================================================================

export const postsContract = {
  create: authed
    .route({
      method: 'POST',
      path: '/api/communities/:communityId/posts',
    })
    .input(CreatePostInputSchema)
    .output(CreatePostOutputSchema),

  list: authed
    .route({
      method: 'GET',
      path: '/api/communities/:communityId/posts',
    })
    .input(GetPostsInputSchema)
    .output(PostListOutputSchema),

  get: authed
    .route({
      method: 'GET',
      path: '/api/posts/:uri',
    })
    .input(GetPostInputSchema)
    .output(PostOutputSchema),
};

// ============================================================================
// Root Router Contract
// ============================================================================

export const contract = {
  communities: communitiesContract,
  memberships: membershipsContract,
  joinRequests: joinRequestsContract,
  moderation: moderationContract,
  feeds: feedsContract,
  posts: postsContract,
};

export type Contract = typeof contract;
