// Atrarium oRPC Router
// Type-safe API router with automatic OpenAPI generation

import { os, ORPCError } from '@orpc/server';
import { z } from 'zod';
import type { Env } from './types';
import { CreateCommunitySchema } from './schemas/validation';

// ============================================================================
// Context Definition
// ============================================================================

export interface Context {
  env: Env;
  userDid?: string;
}

// Base procedure with context
const pub = os.$context<Context>();

// Authenticated procedures
const authed = pub.use(({ context, next }) => {
  if (!context.userDid) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Missing or invalid authentication' });
  }
  return next({ context });
});

// ============================================================================
// Communities Router
// ============================================================================

const CommunityOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  stage: z.enum(['theme', 'community', 'graduated']),
  memberCount: z.number(),
  postCount: z.number(),
  createdAt: z.number(),
});

const communitiesRouter = {
  list: authed
    .route({
      method: 'GET',
      path: '/api/communities',
    })
    .output(z.object({
      data: z.array(CommunityOutputSchema),
    }))
    .handler(async () => {
      // TODO: Implement PDS-based community listing
      return { data: [] };
    }),

  create: authed
    .route({
      method: 'POST',
      path: '/api/communities',
    })
    .input(CreateCommunitySchema)
    .output(CommunityOutputSchema)
    .handler(async ({ input, context }) => {
      const { env, userDid } = context;

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

  get: authed
    .route({
      method: 'GET',
      path: '/api/communities/:id',
    })
    .input(z.object({ id: z.string() }))
    .output(CommunityOutputSchema)
    .handler(async () => {
      // TODO: Implement PDS-based community retrieval
      throw new ORPCError('NOT_IMPLEMENTED', {
        message: 'PDS-based retrieval not yet implemented',
      });
    }),
};

// ============================================================================
// Root Router
// ============================================================================

export const router = {
  communities: communitiesRouter,
};

export type Router = typeof router;
