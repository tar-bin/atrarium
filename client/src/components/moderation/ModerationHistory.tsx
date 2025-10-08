import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ModerationAction {
  uri: string;
  action: 'hide_post' | 'unhide_post' | 'block_user' | 'unblock_user';
  target: { uri?: string; did?: string };
  reason?: string;
  createdAt: string;
}

interface ModerationHistoryProps {
  communityId: string;
}

export function ModerationHistory({ communityId }: ModerationHistoryProps) {
  // TODO: Implement actual API call
  const { data: actions = [], isLoading } = useQuery<ModerationAction[]>({
    queryKey: ['moderation-history', communityId],
    queryFn: async () => {
      // GET /api/moderation/:communityId/history
      return [];
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderation History</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-muted-foreground">No moderation actions yet</p>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <div key={action.uri} className="border-b pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge>{action.action.replace('_', ' ')}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(action.createdAt).toLocaleString()}
                  </span>
                </div>
                {action.reason && (
                  <p className="text-sm text-muted-foreground">Reason: {action.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
