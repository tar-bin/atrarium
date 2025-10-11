// ParentLink Component (T037)
// Display breadcrumb with clickable parent link (Theme groups only)

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface ParentLinkProps {
  groupId: string;
  groupStage: 'theme' | 'community' | 'graduated';
}

export function ParentLink({ groupId, groupStage }: ParentLinkProps) {
  const { data: parent, isLoading } = useQuery({
    queryKey: ['group', groupId, 'parent'],
    queryFn: () => apiClient.communities.getParent({ childId: groupId }),
    enabled: groupStage === 'theme',
  });

  // Only show for Theme groups
  if (groupStage !== 'theme') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading parent...</span>
      </div>
    );
  }

  if (!parent) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      <Link
        to="/communities/$communityId"
        params={{ communityId: parent.id }}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {parent.name}
      </Link>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      <span className="text-foreground">Current Theme</span>
    </nav>
  );
}
