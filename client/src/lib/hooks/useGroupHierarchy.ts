// TanStack Query hooks for hierarchy operations (T042)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch children of a parent group
 */
export function useChildren(groupId: string, options?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: ['group', groupId, 'children', options],
    queryFn: () =>
      apiClient.communities.listChildren({
        parentId: groupId,
        limit: options?.limit,
        cursor: options?.cursor,
      }),
  });
}

/**
 * Fetch parent of a child group
 */
export function useParent(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId, 'parent'],
    queryFn: () => apiClient.communities.getParent({ childId: groupId }),
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Upgrade group stage (Theme → Community, Community → Graduated)
 */
export function useUpgradeStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { groupId: string; targetStage: 'community' | 'graduated' }) => {
      return apiClient.communities.upgradeStage(params);
    },
    onSuccess: (_data, variables) => {
      // Invalidate group query to refetch updated stage
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/**
 * Downgrade group stage (Graduated → Community, Community → Theme)
 */
export function useDowngradeStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { groupId: string; targetStage: 'theme' | 'community' }) => {
      return apiClient.communities.downgradeStage(params);
    },
    onSuccess: (_data, variables) => {
      // Invalidate group query to refetch updated stage
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/**
 * Create child theme under Graduated parent
 */
export function useCreateChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      parentId: string;
      name: string;
      description?: string;
      feedMix?: { own: number; parent: number; global: number };
    }) => {
      return apiClient.communities.createChild(params);
    },
    onSuccess: (_data, variables) => {
      // Invalidate parent's children query
      queryClient.invalidateQueries({ queryKey: ['group', variables.parentId, 'children'] });
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/**
 * Delete group (with children validation)
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      return apiClient.communities.delete({ id: groupId });
    },
    onSuccess: (_data, groupId) => {
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      // Remove deleted group from cache
      queryClient.removeQueries({ queryKey: ['group', groupId] });
    },
  });
}
