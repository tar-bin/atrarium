import { useQuery } from '@tanstack/react-query';
import { UserPlus, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CommunityStatsProps {
  communityId: string;
}

export function CommunityStatsPanel({ communityId }: CommunityStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['community-stats', communityId],
    queryFn: async () => {
      // GET /api/feeds/:communityId/stats
      return { memberCount: 0, pendingRequestCount: 0 };
    },
  });

  if (isLoading) return <div>Loading stats...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats?.memberCount ?? 0}</p>
              <p className="text-sm text-muted-foreground">Active Members</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{stats?.pendingRequestCount ?? 0}</p>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
