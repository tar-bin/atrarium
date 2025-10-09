// Client-compatible router type
// This file provides the RouterClient type for client-side usage

import type { RouterClient } from '@orpc/server';
import { contract } from './router';

// Convert contract to router with handlers (for type inference)
// Note: This is a type-level operation only, no runtime implementation
const router = {
  communities: {
    list: contract.communities.list.handler(async () => ({ data: [] })),
    create: contract.communities.create.handler(async () => ({}) as any),
    get: contract.communities.get.handler(async () => ({}) as any),
  },
  memberships: {
    list: contract.memberships.list.handler(async () => ({}) as any),
    get: contract.memberships.get.handler(async () => ({}) as any),
    join: contract.memberships.join.handler(async () => ({}) as any),
    leave: contract.memberships.leave.handler(async () => ({}) as any),
    update: contract.memberships.update.handler(async () => ({}) as any),
  },
  joinRequests: {
    list: contract.joinRequests.list.handler(async () => ({}) as any),
    approve: contract.joinRequests.approve.handler(async () => ({}) as any),
    reject: contract.joinRequests.reject.handler(async () => ({}) as any),
  },
  moderation: {
    hidePost: contract.moderation.hidePost.handler(async () => ({}) as any),
    unhidePost: contract.moderation.unhidePost.handler(async () => ({}) as any),
    blockUser: contract.moderation.blockUser.handler(async () => ({}) as any),
    unblockUser: contract.moderation.unblockUser.handler(async () => ({}) as any),
    list: contract.moderation.list.handler(async () => ({}) as any),
  },
  feeds: {
    list: contract.feeds.list.handler(async () => ({}) as any),
    get: contract.feeds.get.handler(async () => ({}) as any),
  },
  posts: {
    create: contract.posts.create.handler(async () => ({}) as any),
    list: contract.posts.list.handler(async () => ({}) as any),
    get: contract.posts.get.handler(async () => ({}) as any),
  },
  emoji: {
    upload: contract.emoji.upload.handler(async () => ({}) as any),
    list: contract.emoji.list.handler(async () => ({}) as any),
    submit: contract.emoji.submit.handler(async () => ({}) as any),
    listPending: contract.emoji.listPending.handler(async () => ({}) as any),
    approve: contract.emoji.approve.handler(async () => ({}) as any),
    revoke: contract.emoji.revoke.handler(async () => ({}) as any),
    registry: contract.emoji.registry.handler(async () => ({}) as any),
  },
};

// Export client-compatible router type
export type ClientRouter = RouterClient<typeof router>;
