import type { Community } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Crown, Shield } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface CommunityCardProps {
  community: Community;
  onClick?: () => void;
  userRole?: 'owner' | 'moderator' | 'member'; // User's role in this community
}

export function CommunityCard({ community, onClick, userRole }: CommunityCardProps) {
  const stageBadgeVariant = {
    theme: 'default' as const,
    community: 'secondary' as const,
    graduated: 'outline' as const,
  };

  return (
    <Link to="/communities/$communityId" params={{ communityId: community.id }}>
      <Card
        role="button"
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={onClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{community.name}</CardTitle>
              {userRole === 'owner' && (
                <Crown className="h-4 w-4 text-yellow-600 flex-shrink-0" title="Owner" />
              )}
              {userRole === 'moderator' && (
                <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" title="Moderator" />
              )}
            </div>
            <Badge variant={stageBadgeVariant[community.stage]} className="flex-shrink-0">
              {community.stage.charAt(0).toUpperCase() + community.stage.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{community.memberCount} members</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{community.postCount} posts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
