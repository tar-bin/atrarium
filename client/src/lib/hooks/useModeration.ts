// Moderation-related TanStack Query hooks
// Hooks for moderation queries and actions (hide, unhide, block, unblock)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Query Hooks
// ============================================================================

export function useModerationHistory(communityId: string) {
  return useQuery({
    queryKey: ['moderation-history', communityId],
    queryFn: async () => {
      // GET /api/moderation/:communityId/history
      return [];
    },
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useHidePost() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postUri: _postUri,
      communityId: _communityId,
      reason: _reason,
    }: {
      postUri: string;
      communityId: string;
      reason?: string;
    }) => {
      // POST /api/moderation/hide with { postUri, communityId, reason }
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-feed', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['moderation-history', variables.communityId] });
      toast({ title: 'Post hidden successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to hide post',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useUnhidePost() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postUri: _postUri,
      communityId: _communityId,
      reason: _reason,
    }: {
      postUri: string;
      communityId: string;
      reason?: string;
    }) => {
      // POST /api/moderation/unhide with { postUri, communityId, reason }
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-feed', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['moderation-history', variables.communityId] });
      toast({ title: 'Post unhidden successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to unhide post',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useBlockUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetDid: _targetDid,
      communityId: _communityId,
      reason: _reason,
    }: {
      targetDid: string;
      communityId: string;
      reason?: string;
    }) => {
      // POST /api/moderation/block with { targetDid, communityId, reason }
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-feed', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['moderation-history', variables.communityId] });
      toast({ title: 'User blocked successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to block user',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useUnblockUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetDid: _targetDid,
      communityId: _communityId,
      reason: _reason,
    }: {
      targetDid: string;
      communityId: string;
      reason?: string;
    }) => {
      // POST /api/moderation/unblock with { targetDid, communityId, reason }
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community-feed', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['moderation-history', variables.communityId] });
      toast({ title: 'User unblocked successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to unblock user',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
