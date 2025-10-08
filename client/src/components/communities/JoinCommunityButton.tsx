import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface JoinCommunityButtonProps {
  communityId: string;
  accessType: 'open' | 'invite-only';
  isMember: boolean;
  isPending?: boolean;
  disabled?: boolean;
}

export function JoinCommunityButton({
  communityId,
  accessType,
  isMember,
  isPending = false,
  disabled = false,
}: JoinCommunityButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Implement actual API calls using TanStack Query mutations
  const joinMutation = useMutation({
    mutationFn: async () => {
      // POST /api/memberships with { communityId, accessType }
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Placeholder
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      toast({
        title: accessType === 'open' ? 'Joined successfully' : 'Join request sent',
        description:
          accessType === 'open'
            ? 'You are now a member of this community'
            : 'Your join request is pending approval',
      });
      setIsLoading(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to join',
        description: (error as Error).message,
        variant: 'destructive',
      });
      setIsLoading(false);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      // DELETE /api/memberships/:communityId
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Placeholder
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      toast({
        title: 'Left community',
        description: 'You are no longer a member of this community',
      });
      setIsLoading(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to leave',
        description: (error as Error).message,
        variant: 'destructive',
      });
      setIsLoading(false);
    },
  });

  if (isPending) {
    return (
      <Button variant="outline" disabled>
        Pending Approval
      </Button>
    );
  }

  if (isMember) {
    return (
      <Button
        variant="outline"
        onClick={() => leaveMutation.mutate()}
        disabled={disabled || isLoading}
      >
        {isLoading ? 'Leaving...' : 'Leave'}
      </Button>
    );
  }

  return (
    <Button onClick={() => joinMutation.mutate()} disabled={disabled || isLoading}>
      {isLoading ? 'Joining...' : accessType === 'open' ? 'Join' : 'Request to Join'}
    </Button>
  );
}
