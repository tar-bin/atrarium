import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface JoinRequest {
  uri: string;
  did: string;
  requestedAt: string;
}

interface JoinRequestListProps {
  communityId: string;
}

export function JoinRequestList({ communityId }: JoinRequestListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<JoinRequest[]>({
    queryKey: ['join-requests', communityId],
    queryFn: async () => {
      // GET /api/join-requests/:communityId
      return [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (_did: string) => {
      // POST /api/join-requests/:communityId/:did/approve
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', communityId] });
      toast({ title: 'Join request approved' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (_did: string) => {
      // POST /api/join-requests/:communityId/:did/reject
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', communityId] });
      toast({ title: 'Join request rejected' });
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-muted-foreground">No pending join requests</p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.uri} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{request.did}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(request.requestedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(request.did)}
                    disabled={approveMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(request.did)}
                    disabled={rejectMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
