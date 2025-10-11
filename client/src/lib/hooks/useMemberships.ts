// Membership-related TanStack Query hooks
// Hooks for membership queries and mutations (join, leave, approve, reject, etc.)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Query Hooks
// ============================================================================

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

export function useJoinRequests(communityId: string) {
  return useQuery({
    queryKey: ['join-requests', communityId],
    queryFn: async () => {
      // GET /api/join-requests/:communityId (pending memberships, admin only)
      return [];
    },
  });
}

// ============================================================================
// Mutation Hooks
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
