// Atrarium API Contracts - oRPC Router Definition
// Type-safe API contract shared between client and server

import { os } from '@orpc/server';
import {
  AddReactionInputSchema,
  AddReactionOutputSchema,
  ApproveEmojiInputSchema,
  ApproveEmojiOutputSchema,
  ApproveJoinRequestInputSchema,
  BlockUserInputSchema,
  CommunityListOutputSchema,
  CommunityOutputSchema,
  CreateChildInputSchema,
  CreateCommunitySchema,
  CreatePostInputSchema,
  CreatePostOutputSchema,
  DeleteResponseSchema,
  DowngradeStageInputSchema,
  FeedListOutputSchema,
  FeedOutputSchema,
  GetCommunityInputSchema,
  GetEmojiRegistryInputSchema,
  GetEmojiRegistryOutputSchema,
  GetFeedInputSchema,
  GetMembershipInputSchema,
  GetParentInputSchema,
  GetPostInputSchema,
  GetPostsInputSchema,
  GroupResponseSchema,
  HidePostInputSchema,
  JoinCommunityInputSchema,
  JoinRequestListOutputSchema,
  LeaveCommunityInputSchema,
  ListChildrenInputSchema,
  ListChildrenResponseSchema,
  ListEmojiInputSchema,
  ListEmojiOutputSchema,
  ListFeedsInputSchema,
  ListJoinRequestsInputSchema,
  ListMembershipsInputSchema,
  ListModerationActionsInputSchema,
  ListPendingEmojiInputSchema,
  ListPendingEmojiOutputSchema,
  ListReactionsInputSchema,
  ListReactionsOutputSchema,
  MembershipListOutputSchema,
  MembershipOutputSchema,
  ModerationActionListOutputSchema,
  ModerationActionOutputSchema,
  PostListOutputSchema,
  PostOutputSchema,
  RejectJoinRequestInputSchema,
  RemoveReactionInputSchema,
  RemoveReactionOutputSchema,
  RevokeEmojiInputSchema,
  RevokeEmojiOutputSchema,
  SubmitEmojiInputSchema,
  SubmitEmojiOutputSchema,
  UnblockUserInputSchema,
  UnhidePostInputSchema,
  UpdateMembershipInputSchema,
  UpgradeStageInputSchema,
  UploadEmojiInputSchema,
  UploadEmojiOutputSchema,
} from './schemas';

// ============================================================================
// Context Definition
// ============================================================================

export interface Context {
  // biome-ignore lint/suspicious/noExplicitAny: Server-side env binding, client-compatible type
  env?: any;
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

  // Hierarchy endpoints (017-1-1, T033)
  createChild: authed
    .route({
      method: 'POST',
      path: '/api/communities/:id/children',
    })
    .input(CreateChildInputSchema)
    .output(GroupResponseSchema),

  upgradeStage: authed
    .route({
      method: 'POST',
      path: '/api/communities/:id/upgrade',
    })
    .input(UpgradeStageInputSchema)
    .output(GroupResponseSchema),

  downgradeStage: authed
    .route({
      method: 'POST',
      path: '/api/communities/:id/downgrade',
    })
    .input(DowngradeStageInputSchema)
    .output(GroupResponseSchema),

  listChildren: pub
    .route({
      method: 'GET',
      path: '/api/communities/:id/children',
    })
    .input(ListChildrenInputSchema)
    .output(ListChildrenResponseSchema),

  getParent: pub
    .route({
      method: 'GET',
      path: '/api/communities/:id/parent',
    })
    .input(GetParentInputSchema)
    .output(GroupResponseSchema.nullable()),

  delete: authed
    .route({
      method: 'DELETE',
      path: '/api/communities/:id',
    })
    .input(GetCommunityInputSchema)
    .output(DeleteResponseSchema),
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
    .input(ListModerationActionsInputSchema)
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
// Emoji Router Contract (015-markdown-pds: Custom Emoji)
// ============================================================================

export const emojiContract = {
  upload: authed
    .route({
      method: 'POST',
      path: '/api/emoji/upload',
    })
    .input(UploadEmojiInputSchema)
    .output(UploadEmojiOutputSchema),

  list: authed
    .route({
      method: 'GET',
      path: '/api/emoji/list',
    })
    .input(ListEmojiInputSchema)
    .output(ListEmojiOutputSchema),

  submit: authed
    .route({
      method: 'POST',
      path: '/api/communities/:id/emoji/submit',
    })
    .input(SubmitEmojiInputSchema)
    .output(SubmitEmojiOutputSchema),

  listPending: authed
    .route({
      method: 'GET',
      path: '/api/communities/:id/emoji/pending',
    })
    .input(ListPendingEmojiInputSchema)
    .output(ListPendingEmojiOutputSchema),

  approve: authed
    .route({
      method: 'POST',
      path: '/api/communities/:id/emoji/approve',
    })
    .input(ApproveEmojiInputSchema)
    .output(ApproveEmojiOutputSchema),

  revoke: authed
    .route({
      method: 'POST',
      path: '/api/communities/:id/emoji/revoke',
    })
    .input(RevokeEmojiInputSchema)
    .output(RevokeEmojiOutputSchema),

  registry: pub
    .route({
      method: 'GET',
      path: '/api/communities/:id/emoji/registry',
    })
    .input(GetEmojiRegistryInputSchema)
    .output(GetEmojiRegistryOutputSchema),
};

// ============================================================================
// Reactions Router Contract
// ============================================================================

export const reactionsContract = {
  add: authed
    .route({
      method: 'POST',
      path: '/api/reactions/add',
    })
    .input(AddReactionInputSchema)
    .output(AddReactionOutputSchema),

  remove: authed
    .route({
      method: 'DELETE',
      path: '/api/reactions/remove',
    })
    .input(RemoveReactionInputSchema)
    .output(RemoveReactionOutputSchema),

  list: pub
    .route({
      method: 'GET',
      path: '/api/reactions/list',
    })
    .input(ListReactionsInputSchema)
    .output(ListReactionsOutputSchema),
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
  // emoji: emojiContract, // TODO (018-api-orpc): Deferred - requires schema redesign
  reactions: reactionsContract, // Phase 4: Reactions Migration (T030-T039)
};

export type Contract = typeof contract;
