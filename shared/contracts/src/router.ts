// Atrarium API Contracts - oRPC Router Definition
// Type-safe API contract shared between client and server

import { os } from '@orpc/server';
import {
  CreateCommunitySchema,
  CommunityOutputSchema,
  CommunityListOutputSchema,
  GetCommunityInputSchema,
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
// Root Router Contract
// ============================================================================

export const contract = {
  communities: communitiesContract,
};

export type Contract = typeof contract;
