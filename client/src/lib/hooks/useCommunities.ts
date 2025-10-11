// Community-related TanStack Query hooks
// Hooks for community queries and feed operations

import { type UseQueryOptions, useQuery } from '@tanstack/react-query';

// ============================================================================
// Query Hooks
// ============================================================================

export function useCommunities(options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      // TODO: Replace with actual oRPC call
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5-minute cache for static data
    ...options,
  });
}

export function useCommunity(communityId: string) {
  return useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => {
      const apiClient = (await import('../api')).apiClient;
      const result = await apiClient.communities.get({ id: communityId });
      return result;
    },
  });
}

export function useCommunityStats(communityId: string) {
  return useQuery({
    queryKey: ['community-stats', communityId],
    queryFn: async () => {
      // GET /api/feeds/:communityId/stats (memberCount and pendingRequestCount only)
      return { memberCount: 0, pendingRequestCount: 0 };
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

export function useCommunityFeed(communityId: string, _limit = 20) {
  return useQuery({
    queryKey: ['community-feed', communityId],
    queryFn: async () => {
      // GET /api/feeds/:communityId?limit=20
      return { feed: [], cursor: undefined };
    },
    refetchInterval: 20000, // Poll every 20 seconds
    refetchOnWindowFocus: false,
  });
}
