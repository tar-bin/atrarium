// Atrarium oRPC Router Implementation
// Server-side handlers for the API contract

import { type Context, contract } from '@atrarium/contracts/router';
import { ORPCError } from '@orpc/server';
import type { Env } from './types';

// ============================================================================
// Server Context Type
// ============================================================================

export type ServerContext = Context & {
  env: Env;
};

// ============================================================================
// Communities Router Implementation
// ============================================================================

export const router = {
  communities: {
    list: contract.communities.list.handler(async ({ context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      const communities = await atproto.listCommunitiesByOwner(userDid || '');

      return {
        data: communities.map((community) => {
          // Extract rkey from AT-URI for URL routing
          // Format: at://did:plc:xxx/collection/rkey → rkey
          const rkey = community.uri.split('/').pop() || community.uri;

          return {
            id: rkey, // Use rkey instead of full AT-URI for URL routing
            name: community.name,
            description: community.description || null,
            stage: community.stage,
            memberCount: 0, // TODO: Calculate from stats
            postCount: 0, // TODO: Calculate from Durable Object
            createdAt: new Date(community.createdAt).getTime(),
          };
        }),
      };
    }),

    create: contract.communities.create.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;

      // Generate unique hashtag for the community
      const hashtag = `#atrarium_${Math.random().toString(16).substring(2, 10)}`;
      const now = new Date().toISOString();

      // Create CommunityConfig record in PDS
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      const pdsResult = await atproto.createCommunityConfig({
        $type: 'net.atrarium.community.config',
        name: input.name,
        description: input.description || '',
        hashtag,
        stage: 'theme',
        accessType: 'open', // Default to open
        createdAt: now,
      });

      const communityId = pdsResult.rkey;

      // Initialize Durable Object
      if (!env.COMMUNITY_FEED) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'COMMUNITY_FEED Durable Object binding not found',
        });
      }

      const id = env.COMMUNITY_FEED.idFromName(communityId);
      const stub = env.COMMUNITY_FEED.get(id);

      await stub.fetch(
        new Request('http://fake-host/updateConfig', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: input.name,
            description: input.description,
            hashtag,
            stage: 'theme',
            createdAt: now,
          }),
        })
      );

      await stub.fetch(
        new Request('http://fake-host/addMember', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            did: userDid,
            role: 'owner',
            joinedAt: now,
            active: true,
          }),
        })
      );

      return {
        id: communityId,
        name: input.name,
        description: input.description || null,
        stage: 'theme' as const,
        memberCount: 1,
        postCount: 0,
        createdAt: Math.floor(new Date(now).getTime() / 1000),
      };
    }),

    get: contract.communities.get.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Convert rkey to AT-URI
      // If input.id is already a full AT-URI (starts with "at://"), use it as-is
      // Otherwise, construct AT-URI from userDid and rkey
      let communityUri: string;
      if (input.id.startsWith('at://')) {
        communityUri = input.id;
      } else {
        // Construct AT-URI: at://did:plc:xxx/net.atrarium.community.config/rkey
        communityUri = `at://${userDid}/net.atrarium.community.config/${input.id}`;
      }

      // Fetch community config from PDS
      const community = await atproto.getCommunityConfig(communityUri);

      // Fetch community stats (memberCount, pendingRequestCount)
      const stats = await atproto.getCommunityStats(communityUri);

      // Extract rkey from AT-URI for response
      const rkey = communityUri.split('/').pop() || communityUri;

      return {
        id: rkey, // Return rkey for URL routing consistency
        name: community.name,
        description: community.description || null,
        stage: community.stage,
        memberCount: stats.memberCount,
        postCount: 0, // TODO: Calculate from Durable Object
        createdAt: new Date(community.createdAt).getTime(),
      };
    }),
  },

  // ==========================================================================
  // Memberships Router Implementation (T029-T035)
  // ==========================================================================

  memberships: {
    list: contract.memberships.list.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      const memberships = await atproto.listMemberships(userDid || '', {
        communityUri: input.communityUri,
        status: input.status === 'all' ? undefined : input.status,
      });

      return {
        data: memberships.map((m) => ({
          uri: m.uri,
          community: m.community,
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt,
          active: m.active,
          invitedBy: m.invitedBy,
          customTitle: m.customTitle,
          userDid: m.uri.split('/')[0]?.replace('at://', '') || '',
        })),
      };
    }),

    get: contract.memberships.get.handler(async ({ input, context }) => {
      const { env } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      const membership = await atproto.getMembershipRecord(input.membershipUri);

      return {
        uri: membership.uri,
        community: membership.community,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
        active: membership.active,
        invitedBy: membership.invitedBy,
        customTitle: membership.customTitle,
        userDid: membership.uri.split('/')[0]?.replace('at://', '') || '',
      };
    }),

    join: contract.memberships.join.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Get community config to check accessType
      const communityConfig = await atproto.getCommunityConfig(input.communityUri);

      // Determine status based on accessType
      const status = communityConfig.accessType === 'invite-only' ? 'pending' : 'active';

      // Check for duplicate membership
      const existingMemberships = await atproto.listMemberships(userDid || '', {
        communityUri: input.communityUri,
      });

      if (existingMemberships.length > 0) {
        throw new ORPCError('CONFLICT', {
          message: 'User is already a member of this community',
        });
      }

      // Create membership record
      const result = await atproto.createMembershipRecord(
        {
          $type: 'net.atrarium.community.membership',
          community: input.communityUri,
          role: 'member',
          status,
          joinedAt: new Date().toISOString(),
          active: status === 'active', // Only active if auto-approved
        },
        userDid || ''
      );

      const membership = await atproto.getMembershipRecord(result.uri);

      return {
        uri: membership.uri,
        community: membership.community,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
        active: membership.active,
        invitedBy: membership.invitedBy,
        customTitle: membership.customTitle,
        userDid: userDid || '',
      };
    }),

    leave: contract.memberships.leave.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Get membership to verify ownership
      const membership = await atproto.getMembershipRecord(input.membershipUri);

      // Verify user is leaving their own membership
      const memberDid = input.membershipUri.split('/')[0]?.replace('at://', '');
      if (memberDid !== userDid) {
        throw new ORPCError('FORBIDDEN', {
          message: "Cannot leave another user's membership",
        });
      }

      // Verify user is not the owner
      if (membership.role === 'owner') {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Owner cannot leave community. Transfer ownership first.',
        });
      }

      // Deactivate membership
      const updated = await atproto.deleteMembershipRecord(input.membershipUri);

      return {
        uri: updated.uri,
        community: updated.community,
        role: updated.role,
        status: updated.status,
        joinedAt: updated.joinedAt,
        active: updated.active,
        invitedBy: updated.invitedBy,
        customTitle: updated.customTitle,
        userDid: userDid || '',
      };
    }),

    update: contract.memberships.update.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Get membership to verify permissions
      const membership = await atproto.getMembershipRecord(input.membershipUri);

      // Verify user is owner (only owner can update roles/titles)
      const userMemberships = await atproto.listMemberships(userDid || '', {
        communityUri: membership.community,
      });

      const userMembership = userMemberships.find((m) => m.active && m.status === 'active');
      if (!userMembership || userMembership.role !== 'owner') {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only owner can update membership roles',
        });
      }

      // If changing role to owner, enforce uniqueness
      if (input.role === 'owner') {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Use transfer ownership endpoint to change owner',
        });
      }

      // Update membership
      const updated = await atproto.updateMembershipRecord(input.membershipUri, {
        role: input.role,
        customTitle: input.customTitle,
      });

      return {
        uri: updated.uri,
        community: updated.community,
        role: updated.role,
        status: updated.status,
        joinedAt: updated.joinedAt,
        active: updated.active,
        invitedBy: updated.invitedBy,
        customTitle: updated.customTitle,
        userDid: updated.uri.split('/')[0]?.replace('at://', '') || '',
      };
    }),
  },

  // ==========================================================================
  // Join Requests Router Implementation (T036-T038)
  // ==========================================================================

  joinRequests: {
    list: contract.joinRequests.list.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Verify user is admin
      const userMemberships = await atproto.listMemberships(userDid || '', {
        communityUri: input.communityUri,
      });

      const userMembership = userMemberships.find((m) => m.active && m.status === 'active');
      if (!userMembership || !['owner', 'moderator'].includes(userMembership.role)) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only admins can view join requests',
        });
      }

      // Get community owner DID from community URI
      const ownerDid = input.communityUri.split('/')[0]?.replace('at://', '');
      if (!ownerDid) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Invalid community URI',
        });
      }

      // List all memberships for this community (from owner's PDS)
      const allMemberships = await atproto.listMemberships(ownerDid, {
        communityUri: input.communityUri,
        status: 'pending',
      });

      return {
        data: allMemberships.map((m) => ({
          uri: m.uri,
          community: m.community,
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt,
          active: m.active,
          invitedBy: m.invitedBy,
          customTitle: m.customTitle,
          userDid: m.uri.split('/')[0]?.replace('at://', '') || '',
        })),
      };
    }),

    approve: contract.joinRequests.approve.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Get membership to verify it's pending
      const membership = await atproto.getMembershipRecord(input.membershipUri);

      if (membership.status !== 'pending') {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Membership is not pending',
        });
      }

      // Verify user is admin
      const userMemberships = await atproto.listMemberships(userDid || '', {
        communityUri: membership.community,
      });

      const userMembership = userMemberships.find((m) => m.active && m.status === 'active');
      if (!userMembership || !['owner', 'moderator'].includes(userMembership.role)) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only admins can approve join requests',
        });
      }

      // Update membership status to active
      const updated = await atproto.updateMembershipRecord(input.membershipUri, {
        status: 'active',
      });

      return {
        uri: updated.uri,
        community: updated.community,
        role: updated.role,
        status: updated.status,
        joinedAt: updated.joinedAt,
        active: updated.active,
        invitedBy: updated.invitedBy,
        customTitle: updated.customTitle,
        userDid: updated.uri.split('/')[0]?.replace('at://', '') || '',
      };
    }),

    reject: contract.joinRequests.reject.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Get membership to verify it's pending
      const membership = await atproto.getMembershipRecord(input.membershipUri);

      if (membership.status !== 'pending') {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Membership is not pending',
        });
      }

      // Verify user is admin
      const userMemberships = await atproto.listMemberships(userDid || '', {
        communityUri: membership.community,
      });

      const userMembership = userMemberships.find((m) => m.active && m.status === 'active');
      if (!userMembership || !['owner', 'moderator'].includes(userMembership.role)) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only admins can reject join requests',
        });
      }

      // Delete membership record
      const deleted = await atproto.deleteMembershipRecord(input.membershipUri);

      return {
        uri: deleted.uri,
        community: deleted.community,
        role: deleted.role,
        status: deleted.status,
        joinedAt: deleted.joinedAt,
        active: deleted.active,
        invitedBy: deleted.invitedBy,
        customTitle: deleted.customTitle,
        userDid: deleted.uri.split('/')[0]?.replace('at://', '') || '',
      };
    }),
  },

  // ==========================================================================
  // Moderation Router Implementation (T039-T043)
  // ==========================================================================

  moderation: {
    hidePost: contract.moderation.hidePost.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Verify user is admin
      const userMemberships = await atproto.listMemberships(userDid || '', {
        communityUri: input.communityUri,
      });

      const userMembership = userMemberships.find((m) => m.active && m.status === 'active');
      if (!userMembership || !['owner', 'moderator'].includes(userMembership.role)) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only admins can hide posts',
        });
      }

      // Create moderation action in moderator's PDS
      const result = await atproto.createModerationAction(
        {
          $type: 'net.atrarium.moderation.action',
          action: 'hide_post',
          target: {
            uri: input.postUri,
            cid: input.postCid,
          },
          community: input.communityUri,
          reason: input.reason,
          createdAt: new Date().toISOString(),
        },
        userDid || ''
      );

      return {
        uri: result.uri,
        action: 'hide_post' as const,
        target: {
          uri: input.postUri,
          cid: input.postCid,
        },
        community: input.communityUri,
        reason: input.reason,
        createdAt: new Date().toISOString(),
        moderatorDid: userDid || '',
      };
    }),

    unhidePost: contract.moderation.unhidePost.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Verify user is admin
      const userMemberships = await atproto.listMemberships(userDid || '', {
        communityUri: input.communityUri,
      });

      const userMembership = userMemberships.find((m) => m.active && m.status === 'active');
      if (!userMembership || !['owner', 'moderator'].includes(userMembership.role)) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only admins can unhide posts',
        });
      }

      // Create moderation action in moderator's PDS
      const result = await atproto.createModerationAction(
        {
          $type: 'net.atrarium.moderation.action',
          action: 'unhide_post',
          target: {
            uri: input.postUri,
            cid: input.postCid,
          },
          community: input.communityUri,
          createdAt: new Date().toISOString(),
        },
        userDid || ''
      );

      return {
        uri: result.uri,
        action: 'unhide_post' as const,
        target: {
          uri: input.postUri,
          cid: input.postCid,
        },
        community: input.communityUri,
        reason: undefined,
        createdAt: new Date().toISOString(),
        moderatorDid: userDid || '',
      };
    }),

    blockUser: contract.moderation.blockUser.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Verify user is admin
      const userMemberships = await atproto.listMemberships(userDid || '', {
        communityUri: input.communityUri,
      });

      const userMembership = userMemberships.find((m) => m.active && m.status === 'active');
      if (!userMembership || !['owner', 'moderator'].includes(userMembership.role)) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only admins can block users',
        });
      }

      // Create moderation action in moderator's PDS
      const result = await atproto.createModerationAction(
        {
          $type: 'net.atrarium.moderation.action',
          action: 'block_user',
          target: {
            did: input.userDid,
          },
          community: input.communityUri,
          reason: input.reason,
          createdAt: new Date().toISOString(),
        },
        userDid || ''
      );

      // Also update community config blocklist
      const communityConfig = await atproto.getCommunityConfig(input.communityUri);
      const updatedBlocklist = [...(communityConfig.blocklist || []), input.userDid];

      await atproto.updateCommunityConfig(input.communityUri, {
        blocklist: updatedBlocklist,
      });

      return {
        uri: result.uri,
        action: 'block_user' as const,
        target: {
          did: input.userDid,
        },
        community: input.communityUri,
        reason: input.reason,
        createdAt: new Date().toISOString(),
        moderatorDid: userDid || '',
      };
    }),

    unblockUser: contract.moderation.unblockUser.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Verify user is admin
      const userMemberships = await atproto.listMemberships(userDid || '', {
        communityUri: input.communityUri,
      });

      const userMembership = userMemberships.find((m) => m.active && m.status === 'active');
      if (!userMembership || !['owner', 'moderator'].includes(userMembership.role)) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only admins can unblock users',
        });
      }

      // Create moderation action in moderator's PDS
      const result = await atproto.createModerationAction(
        {
          $type: 'net.atrarium.moderation.action',
          action: 'unblock_user',
          target: {
            did: input.userDid,
          },
          community: input.communityUri,
          createdAt: new Date().toISOString(),
        },
        userDid || ''
      );

      // Also update community config blocklist
      const communityConfig = await atproto.getCommunityConfig(input.communityUri);
      const updatedBlocklist = (communityConfig.blocklist || []).filter(
        (did) => did !== input.userDid
      );

      await atproto.updateCommunityConfig(input.communityUri, {
        blocklist: updatedBlocklist,
      });

      return {
        uri: result.uri,
        action: 'unblock_user' as const,
        target: {
          did: input.userDid,
        },
        community: input.communityUri,
        reason: undefined,
        createdAt: new Date().toISOString(),
        moderatorDid: userDid || '',
      };
    }),

    list: contract.moderation.list.handler(async () => {
      // TODO: This needs communityUri from input, but contract doesn't specify it
      // For now, return empty list
      // In production, should list all moderation actions for communities where user is admin

      return {
        data: [],
      };
    }),
  },

  // ==========================================================================
  // Feeds Router Implementation (T044-T045)
  // ==========================================================================

  feeds: {
    list: contract.feeds.list.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // List user's memberships
      const memberships = await atproto.listMemberships(userDid || '', {
        status: input.status === 'all' ? undefined : 'active',
        activeOnly: input.status !== 'all',
      });

      // For each membership, get community config and stats
      const feeds = await Promise.all(
        memberships.map(async (membership) => {
          const communityConfig = await atproto.getCommunityConfig(membership.community);
          const stats = await atproto.getCommunityStats(membership.community);

          return {
            uri: `at://${env.BLUESKY_HANDLE}/app.bsky.feed.generator/${communityConfig.hashtag}`, // TODO: Fix feed URI format
            communityUri: membership.community,
            name: communityConfig.name,
            description: communityConfig.description || null,
            hashtag: communityConfig.hashtag,
            stage: communityConfig.stage,
            memberCount: stats.memberCount,
            pendingRequestCount: stats.pendingRequestCount,
            createdAt: communityConfig.createdAt,
          };
        })
      );

      return {
        data: feeds,
      };
    }),

    get: contract.feeds.get.handler(async ({ input, context }) => {
      const { env } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Get community config
      const communityConfig = await atproto.getCommunityConfig(input.communityUri);

      // Get community stats
      const stats = await atproto.getCommunityStats(input.communityUri);

      return {
        uri: `at://${env.BLUESKY_HANDLE}/app.bsky.feed.generator/${communityConfig.hashtag}`, // TODO: Fix feed URI format
        communityUri: input.communityUri,
        name: communityConfig.name,
        description: communityConfig.description || null,
        hashtag: communityConfig.hashtag,
        stage: communityConfig.stage,
        memberCount: stats.memberCount,
        pendingRequestCount: stats.pendingRequestCount,
        createdAt: communityConfig.createdAt,
      };
    }),
  },
};

// Export server router type
export type Router = typeof router;

// Export client-compatible type using RouterClient
// This type can be used with createORPCClient for full type safety
import type { RouterClient } from '@orpc/server';
export type ClientRouter = RouterClient<typeof router>;
