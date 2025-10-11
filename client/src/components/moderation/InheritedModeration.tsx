// InheritedModeration Component (T038)
// Display moderation inheritance status (Theme vs Community/Graduated)

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Shield, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';

interface InheritedModerationProps {
  groupId: string;
  groupStage: 'theme' | 'community' | 'graduated';
}

export function InheritedModeration({ groupId, groupStage }: InheritedModerationProps) {
  const { data: parent, isLoading } = useQuery({
    queryKey: ['group', groupId, 'parent'],
    queryFn: () => apiClient.communities.getParent({ childId: groupId }),
    enabled: groupStage === 'theme',
  });

  // Theme groups: inherited moderation
  if (groupStage === 'theme') {
    if (isLoading) {
      return (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>Loading moderation info...</AlertDescription>
        </Alert>
      );
    }

    if (parent) {
      return (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Moderated by:</strong>{' '}
            <Link
              to="/communities/$communityId"
              params={{ communityId: parent.id }}
              className="underline hover:no-underline"
            >
              {parent.name}
            </Link>{' '}
            (inherited)
            <p className="text-sm text-muted-foreground mt-1">
              This theme group inherits moderation from its parent group. Parent moderators can
              manage posts and members in this theme.
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    // Theme without parent (shouldn't happen, but handle gracefully)
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Independent moderation</strong>
          <p className="text-sm text-muted-foreground mt-1">
            This theme group has independent moderation.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Community/Graduated groups: independent moderation
  return (
    <Alert>
      <ShieldCheck className="h-4 w-4" />
      <AlertDescription>
        <strong>Independent moderation</strong>
        <p className="text-sm text-muted-foreground mt-1">
          This {groupStage}-stage group has its own moderators and independent moderation policies.
        </p>
      </AlertDescription>
    </Alert>
  );
}
