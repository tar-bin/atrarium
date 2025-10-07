// Client-compatible router type
// This file provides the RouterClient type for client-side usage

import type { RouterClient } from '@orpc/server';
import { contract } from './router';

// Convert contract to router with handlers (for type inference)
// Note: This is a type-level operation only, no runtime implementation
const router = {
  communities: {
    list: contract.communities.list.handler(async () => ({ data: [] })),
    create: contract.communities.create.handler(async () => ({} as any)),
    get: contract.communities.get.handler(async () => ({} as any)),
  },
};

// Export client-compatible router type
export type ClientRouter = RouterClient<typeof router>;
