// Atrarium oRPC Router Implementation
// Server-side handlers for the API contract

import { ORPCError } from '@orpc/server';
import { contract, type Context } from '@atrarium/contracts/router';
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
    list: contract.communities.list.handler(async () => {
      // TODO: Implement PDS-based community listing
      return { data: [] };
    }),

    create: contract.communities.create.handler(async ({ input, context }) => {
      const { env, userDid } = context as ServerContext;

      // Generate unique hashtag for the community
      const hashtag = `#atr_${Math.random().toString(16).substring(2, 10)}`;
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

      await stub.fetch(new Request('http://fake-host/updateConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          description: input.description,
          hashtag,
          stage: 'theme',
          createdAt: now,
        }),
      }));

      await stub.fetch(new Request('http://fake-host/addMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: userDid,
          role: 'owner',
          joinedAt: now,
          active: true,
        }),
      }));

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

    get: contract.communities.get.handler(async () => {
      // TODO: Implement PDS-based community retrieval
      throw new ORPCError('NOT_IMPLEMENTED', {
        message: 'PDS-based retrieval not yet implemented',
      });
    }),
  },
};

export type Router = typeof router;
