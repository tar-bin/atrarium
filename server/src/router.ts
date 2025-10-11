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
        $type: 'net.atrarium.group.config',
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
        // Construct AT-URI: at://did:plc:xxx/net.atrarium.group.config/rkey
        communityUri = `at://${userDid}/net.atrarium.group.config/${input.id}`;
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
          $type: 'net.atrarium.group.membership',
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

    list: contract.moderation.list.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Verify user is admin for the specified community
      const userMemberships = await atproto.listMemberships(userDid || '', {
        communityUri: input.communityUri,
      });

      const userMembership = userMemberships.find((m) => m.active && m.status === 'active');
      if (!userMembership || !['owner', 'moderator'].includes(userMembership.role)) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only admins can view moderation actions',
        });
      }

      // List moderation actions for this community
      const actions = await atproto.listModerationActions(input.communityUri, userDid || '');

      // Map reason to enum or undefined
      const validReasons = [
        'spam',
        'low_quality',
        'duplicate',
        'off_topic',
        'wrong_community',
        'guidelines_violation',
        'terms_violation',
        'copyright',
        'harassment',
        'hate_speech',
        'violence',
        'nsfw',
        'illegal_content',
        'bot_activity',
        'impersonation',
        'ban_evasion',
        'other',
      ] as const;

      return {
        data: actions.map((action) => ({
          uri: action.uri,
          action: action.action,
          target: action.target,
          community: action.community,
          reason:
            action.reason && validReasons.includes(action.reason as (typeof validReasons)[number])
              ? (action.reason as (typeof validReasons)[number])
              : undefined,
          createdAt: action.createdAt,
          moderatorDid: userDid || '',
        })),
      };
    }),
  },

  // ==========================================================================
  // Posts Router Implementation (018-api-orpc: T006-T008)
  // ==========================================================================

  posts: {
    create: contract.posts.create.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Verify membership via Durable Object RPC
      const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      const membershipResponse = await feedStub.fetch(
        new Request(`https://internal/checkMembership?did=${userDid}`)
      );

      if (!membershipResponse.ok) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to verify membership',
        });
      }

      const membershipData = (await membershipResponse.json()) as { isMember: boolean };
      if (!membershipData.isMember) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You are not a member of this community',
        });
      }

      // Create post in PDS
      const postRecord = {
        $type: 'net.atrarium.group.post',
        text: input.text,
        communityId: input.communityId,
        createdAt: new Date().toISOString(),
      };

      const result = await atproto.createCommunityPost(postRecord, userDid || '');

      return {
        uri: result.uri,
        rkey: result.rkey,
        createdAt: postRecord.createdAt,
      };
    }),

    list: contract.posts.list.handler(async ({ input, context }) => {
      const { env } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Fetch posts from Durable Object
      const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      const response = await feedStub.fetch(
        new Request(
          `https://internal/posts?limit=${input.limit || 50}${
            input.cursor ? `&cursor=${input.cursor}` : ''
          }`
        )
      );

      if (!response.ok) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to fetch posts',
        });
      }

      const data = (await response.json()) as {
        posts: Array<{ uri: string; authorDid: string; createdAt: string; text?: string }>;
        cursor: string | null;
      };

      // Enrich posts with author profiles
      const authorDids = [...new Set(data.posts.map((p) => p.authorDid))];
      const profiles = await atproto.getProfiles(authorDids);
      const profileMap = new Map(profiles.map((p) => [p.did, p]));

      const enrichedPosts = data.posts.map((post) => ({
        uri: post.uri,
        rkey: post.uri.split('/').pop() || '',
        text: post.text || '',
        communityId: input.communityId,
        createdAt: post.createdAt,
        author: profileMap.get(post.authorDid) || {
          did: post.authorDid,
          handle: 'unknown.bsky.social',
          displayName: null,
          avatar: null,
        },
      }));

      return {
        posts: enrichedPosts,
        cursor: data.cursor,
      };
    }),

    get: contract.posts.get.handler(async ({ input, context }) => {
      const { env } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);
      const agent = await atproto.getAgent();

      // Parse AT-URI
      const uriParts = input.uri.replace('at://', '').split('/');
      const [repo, collection, rkey] = uriParts;

      if (!repo || !collection || !rkey) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Invalid AT-URI format',
        });
      }

      // Validate collection type
      if (collection !== 'net.atrarium.group.post') {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Record is not a community post',
        });
      }

      try {
        // Fetch post from PDS
        const recordResponse = await agent.com.atproto.repo.getRecord({
          repo,
          collection,
          rkey,
        });

        const record = recordResponse.data.value as {
          $type: string;
          text: string;
          communityId: string;
          createdAt: string;
        };

        if (record.$type !== 'net.atrarium.group.post') {
          throw new ORPCError('BAD_REQUEST', {
            message: 'Record is not a community post',
          });
        }

        // Fetch author profile
        const profile = await atproto.getProfile(repo);

        return {
          uri: input.uri,
          rkey,
          text: record.text,
          communityId: record.communityId,
          createdAt: record.createdAt,
          author: profile,
        };
      } catch (error) {
        if (error instanceof ORPCError) {
          throw error;
        }

        // Handle PDS errors
        throw new ORPCError('NOT_FOUND', {
          message: 'Post not found',
        });
      }
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

  // ==========================================================================
  // Reactions Router Implementation (018-api-orpc: T033-T035)
  // ==========================================================================

  reactions: {
    add: contract.reactions.add.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Parse post URI to extract community ID
      const uriParts = input.postUri.replace('at://', '').split('/');
      const [repo, collection, _rkey] = uriParts;

      if (!repo || !collection) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Invalid post URI format',
        });
      }

      // Fetch post from PDS to get communityId
      const agent = await atproto.getAgent();
      let communityId: string;

      try {
        const recordResponse = await agent.com.atproto.repo.getRecord({
          repo,
          collection,
          rkey: _rkey || '',
        });

        const record = recordResponse.data.value as {
          communityId?: string;
        };

        if (!record.communityId) {
          throw new ORPCError('BAD_REQUEST', {
            message: 'Post does not have a community ID',
          });
        }

        communityId = record.communityId;
      } catch (_error) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Post not found',
        });
      }

      // Verify user is member of community via Durable Object RPC
      const feedId = env.COMMUNITY_FEED.idFromName(communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      const membershipResponse = await feedStub.fetch(
        new Request(`https://internal/checkMembership?did=${userDid}`)
      );

      if (!membershipResponse.ok) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to verify membership',
        });
      }

      const membershipData = (await membershipResponse.json()) as { isMember: boolean };
      if (!membershipData.isMember) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You must be a member of the community to react to posts',
        });
      }

      // Validate custom emoji is approved (if applicable)
      if (input.emoji.type === 'custom') {
        // TODO: Implement custom emoji validation
        // For now, accept all custom emojis
      }

      // Create reaction in PDS
      try {
        const result = await atproto.createReaction(input.postUri, input.emoji, communityId);

        return {
          success: true,
          reactionUri: result.uri,
        };
      } catch (error) {
        // Handle duplicate reaction
        if (error instanceof Error && error.message.includes('duplicate')) {
          throw new ORPCError('CONFLICT', {
            message: 'You have already reacted with this emoji',
          });
        }

        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to create reaction',
        });
      }
    }),

    remove: contract.reactions.remove.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Validate reactionUri format
      if (!input.reactionUri.startsWith('at://')) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'reactionUri must be an AT-URI',
        });
      }

      // Verify user owns the reaction
      const reactionDid = input.reactionUri.split('/')[0]?.replace('at://', '');
      if (reactionDid !== userDid) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You can only remove your own reactions',
        });
      }

      // Delete reaction from PDS
      try {
        await atproto.deleteReaction(input.reactionUri);

        return {
          success: true,
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          // Idempotent: return success even if already deleted
          return {
            success: true,
          };
        }

        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to remove reaction',
        });
      }
    }),

    list: contract.reactions.list.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);

      // Validate postUri format
      if (!input.postUri.startsWith('at://')) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'postUri must be an AT-URI',
        });
      }

      // Parse post URI to extract community ID
      const uriParts = input.postUri.replace('at://', '').split('/');
      const [repo, collection, _rkey] = uriParts;

      if (!repo || !collection || !_rkey) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Invalid post URI format',
        });
      }

      // Fetch post from PDS to get communityId
      const agent = await atproto.getAgent();
      let communityId: string;

      try {
        const recordResponse = await agent.com.atproto.repo.getRecord({
          repo,
          collection,
          rkey: _rkey,
        });

        const record = recordResponse.data.value as {
          communityId?: string;
        };

        if (!record.communityId) {
          throw new ORPCError('BAD_REQUEST', {
            message: 'Post does not have a community ID',
          });
        }

        communityId = record.communityId;
      } catch (_error) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Post not found',
        });
      }

      // Fetch reaction aggregates from Durable Object
      const feedId = env.COMMUNITY_FEED.idFromName(communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      const response = await feedStub.fetch(
        new Request(`https://internal/reactions?postUri=${encodeURIComponent(input.postUri)}`)
      );

      if (!response.ok) {
        // Return empty list if Durable Object doesn't have data yet
        return {
          reactions: [],
        };
      }

      const data = (await response.json()) as {
        reactions: Array<{
          emoji: { type: 'unicode' | 'custom'; value: string };
          count: number;
          reactors: string[];
        }>;
      };

      // Add currentUserReacted flag
      const reactions = data.reactions.map((reaction) => ({
        ...reaction,
        currentUserReacted: userDid ? reaction.reactors.includes(userDid) : false,
      }));

      return {
        reactions,
      };
    }),
  },

  // ==========================================================================
  // Emoji Router (Phase 3: Emoji Migration - T020-T026, 018-api-orpc)
  // ==========================================================================

  emoji: {
    // T020: Upload emoji (base64 approach)
    upload: contract.emoji.upload.handler(async ({ input, context }) => {
      const { env } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);
      const agent = await atproto.getAgent();

      // Extract format from mimeType
      const formatMap: Record<string, 'png' | 'gif' | 'webp'> = {
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
      };
      const format = formatMap[input.mimeType];
      if (!format) {
        throw new ORPCError('BAD_REQUEST', {
          message: `Unsupported mime type: ${input.mimeType}`,
        });
      }

      // Upload blob to PDS (base64 → Uint8Array)
      const blobRef = await atproto.uploadEmojiBlob(
        agent,
        input.fileData,
        input.mimeType,
        input.size
      );

      // Create CustomEmoji record in PDS
      const result = await atproto.createCustomEmoji(
        agent,
        input.shortcode,
        blobRef,
        format,
        input.size,
        input.dimensions,
        input.animated
      );

      return {
        emojiURI: result.uri,
        blob: blobRef,
      };
    }),

    // T021: List user's uploaded emojis
    list: contract.emoji.list.handler(async ({ input, context }) => {
      const { env } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);
      const agent = await atproto.getAgent();

      // List user's custom emoji from PDS
      const emojis = await atproto.listUserEmoji(agent, input.did);

      return {
        emoji: emojis,
      };
    }),

    // T022: Submit emoji for community approval
    submit: contract.emoji.submit.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;

      // Verify membership
      const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      const membershipResponse = await feedStub.fetch(
        new Request(`https://internal/checkMembership?did=${userDid}`)
      );

      if (!membershipResponse.ok) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You are not a member of this community',
        });
      }

      const membershipData = (await membershipResponse.json()) as { isMember: boolean };
      if (!membershipData.isMember) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You are not a member of this community',
        });
      }

      // Create Durable Object submission entry (pending approval)
      const submitResponse = await feedStub.fetch(
        new Request('https://internal/submitEmoji', {
          method: 'POST',
          body: JSON.stringify({
            emojiURI: input.emojiURI,
            submitter: userDid,
          }),
        })
      );

      if (!submitResponse.ok) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to submit emoji for approval',
        });
      }

      const data = (await submitResponse.json()) as { submissionId: string };

      return {
        submissionId: data.submissionId,
        status: 'pending' as const,
      };
    }),

    // T023: List pending emoji approvals (owner-only)
    listPending: contract.emoji.listPending.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;

      // Get Durable Object stub
      const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      // Check if user is owner/moderator
      const membershipResponse = await feedStub.fetch(
        new Request(`https://internal/checkMembership?did=${userDid}`)
      );

      if (!membershipResponse.ok) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You are not authorized to view pending approvals',
        });
      }

      const membershipData = (await membershipResponse.json()) as {
        isMember: boolean;
        role?: string;
      };
      if (!membershipData.isMember || !['owner', 'moderator'].includes(membershipData.role || '')) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only owners and moderators can view pending approvals',
        });
      }

      // Fetch pending submissions from Durable Object
      const pendingResponse = await feedStub.fetch(new Request('https://internal/pendingEmojis'));

      if (!pendingResponse.ok) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to fetch pending approvals',
        });
      }

      const data = (await pendingResponse.json()) as {
        submissions: Array<{
          emojiUri: string;
          shortcode: string;
          creator: string;
          creatorHandle: string;
          uploadedAt: string;
          format: 'png' | 'gif' | 'webp';
          animated: boolean;
          blobUrl: string;
        }>;
      };

      return {
        submissions: data.submissions,
      };
    }),

    // T024: Approve/reject emoji (owner-only)
    approve: contract.emoji.approve.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);
      const agent = await atproto.getAgent();

      // Get Durable Object stub
      const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      // Check if user is owner
      const membershipResponse = await feedStub.fetch(
        new Request(`https://internal/checkMembership?did=${userDid}`)
      );

      if (!membershipResponse.ok) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You are not authorized to approve emojis',
        });
      }

      const membershipData = (await membershipResponse.json()) as {
        isMember: boolean;
        role?: string;
      };
      if (!membershipData.isMember || membershipData.role !== 'owner') {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only community owners can approve emojis',
        });
      }

      // Extract shortcode from emoji URI
      const shortcode = input.emojiURI.split('/').pop() || '';
      if (!shortcode) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Invalid emoji URI',
        });
      }

      // Create EmojiApproval record in PDS
      const status = input.approve ? 'approved' : 'rejected';
      const result = await atproto.createEmojiApproval(
        agent,
        shortcode,
        input.emojiURI,
        input.communityId,
        status,
        input.reason
      );

      // Update Durable Object registry if approved
      if (input.approve) {
        await feedStub.fetch(
          new Request('https://internal/updateEmojiRegistry', {
            method: 'POST',
            body: JSON.stringify({
              shortcode,
              emojiURI: input.emojiURI,
              approvalURI: result.uri,
            }),
          })
        );
      }

      return {
        approvalURI: result.uri,
        status: status as 'approved' | 'rejected',
      };
    }),

    // T025: Revoke approved emoji (owner-only)
    revoke: contract.emoji.revoke.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;
      const { ATProtoService } = await import('./services/atproto');
      const atproto = new ATProtoService(env);
      const agent = await atproto.getAgent();

      // Get Durable Object stub
      const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      // Check if user is owner
      const membershipResponse = await feedStub.fetch(
        new Request(`https://internal/checkMembership?did=${userDid}`)
      );

      if (!membershipResponse.ok) {
        throw new ORPCError('FORBIDDEN', {
          message: 'You are not authorized to revoke emojis',
        });
      }

      const membershipData = (await membershipResponse.json()) as {
        isMember: boolean;
        role?: string;
      };
      if (!membershipData.isMember || membershipData.role !== 'owner') {
        throw new ORPCError('FORBIDDEN', {
          message: 'Only community owners can revoke emojis',
        });
      }

      // Get emoji URI from registry
      const registryResponse = await feedStub.fetch(
        new Request(`https://internal/getEmojiRegistry?communityId=${input.communityId}`)
      );

      if (!registryResponse.ok) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to fetch emoji registry',
        });
      }

      const registry = (await registryResponse.json()) as {
        emoji: Record<string, { emojiURI: string }>;
      };
      const emojiMetadata = registry.emoji[input.shortcode];

      if (!emojiMetadata) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Emoji not found in registry',
        });
      }

      // Create revocation record in PDS
      await atproto.createEmojiApproval(
        agent,
        input.shortcode,
        emojiMetadata.emojiURI,
        input.communityId,
        'revoked',
        input.reason
      );

      // Remove from Durable Object registry
      await feedStub.fetch(
        new Request('https://internal/removeFromEmojiRegistry', {
          method: 'POST',
          body: JSON.stringify({
            shortcode: input.shortcode,
          }),
        })
      );

      return {
        success: true,
      };
    }),

    // T026: Get emoji registry (public, no auth required)
    registry: contract.emoji.registry.handler(async ({ input, context }) => {
      const { env } = context as ServerContext;

      // Get Durable Object stub
      const feedId = env.COMMUNITY_FEED.idFromName(input.communityId);
      const feedStub = env.COMMUNITY_FEED.get(feedId);

      // Fetch emoji registry from Durable Object
      const registryResponse = await feedStub.fetch(
        new Request(`https://internal/getEmojiRegistry?communityId=${input.communityId}`)
      );

      if (!registryResponse.ok) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to fetch emoji registry',
        });
      }

      const data = (await registryResponse.json()) as {
        emoji: Record<string, { emojiURI: string; blobURI: string; animated: boolean }>;
      };

      return {
        emoji: data.emoji,
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
