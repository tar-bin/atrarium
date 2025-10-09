// TanStack Query hooks for Atrarium API
// All API hooks for communities, memberships, moderation, and feeds (T082-T100)

import { type UseQueryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Query Hooks (T082-T087, T092, T099)
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
      // TODO: Replace with actual oRPC call
      return null;
    },
  });
}

export function useMyMemberships() {
  return useQuery({
    queryKey: ['memberships', 'my'],
    queryFn: async () => {
      // GET /api/memberships/my (includes status='active' and 'pending')
      return [];
    },
  });
}

export function useCommunityMembers(communityId: string) {
  return useQuery({
    queryKey: ['members', communityId],
    queryFn: async () => {
      // GET /api/memberships/:communityId/members (admin only)
      return [];
    },
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

export function useJoinRequests(communityId: string) {
  return useQuery({
    queryKey: ['join-requests', communityId],
    queryFn: async () => {
      // GET /api/join-requests/:communityId (pending memberships, admin only)
      return [];
    },
  });
}

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
// Mutation Hooks (T088-T091, T093-T098, T100)
// ============================================================================

export function useJoinCommunity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId: _communityId,
      accessType: _accessType,
    }: {
      communityId: string;
      accessType: 'open' | 'invite-only';
    }) => {
      // POST /api/memberships with { communityId, accessType }
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['community', variables.communityId] });
      toast({
        title: variables.accessType === 'open' ? 'Joined successfully' : 'Join request sent',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to join',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useLeaveCommunity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_communityId: string) => {
      // DELETE /api/memberships/:communityId
      return { success: true };
    },
    onSuccess: (_, communityId) => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      toast({ title: 'Left community successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to leave',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useChangeMemberRole() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId: _communityId,
      did: _did,
      newRole: _newRole,
    }: {
      communityId: string;
      did: string;
      newRole: string;
    }) => {
      // PATCH /api/memberships/:communityId/:did/role with { newRole }
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.communityId] });
      toast({ title: 'Role changed successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to change role',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveMember() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId: _communityId,
      did: _did,
    }: {
      communityId: string;
      did: string;
    }) => {
      // DELETE /api/memberships/:communityId/:did
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.communityId] });
      toast({ title: 'Member removed successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove member',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useApproveJoinRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId: _communityId,
      did: _did,
    }: {
      communityId: string;
      did: string;
    }) => {
      // POST /api/join-requests/:communityId/:did/approve
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['members', variables.communityId] });
      toast({ title: 'Join request approved' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to approve',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useRejectJoinRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId: _communityId,
      did: _did,
    }: {
      communityId: string;
      did: string;
    }) => {
      // POST /api/join-requests/:communityId/:did/reject
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', variables.communityId] });
      toast({ title: 'Join request rejected' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to reject',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

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

export function useTransferOwnership() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId: _communityId,
      newOwnerDid: _newOwnerDid,
    }: {
      communityId: string;
      newOwnerDid: string;
    }) => {
      // POST /api/memberships/:communityId/transfer with { newOwnerDid }
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['members', variables.communityId] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      toast({ title: 'Ownership transferred successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to transfer ownership',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
