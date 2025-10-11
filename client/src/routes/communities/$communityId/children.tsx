// Children List Route (T039)
// Display list of child themes for Graduated groups

import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { CreateChildTheme } from '../../../components/communities/CreateChildTheme';
import { GroupHierarchy } from '../../../components/communities/GroupHierarchy';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { apiClient } from '../../../lib/api';

// @ts-expect-error - TanStack Router type generation doesn't include this route yet
export const Route = createFileRoute('/communities/$communityId/children')({
  component: ChildrenListPage,
});

function ChildrenListPage() {
  // @ts-expect-error - Route params type not generated yet
  const { communityId } = Route.useParams();

  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', communityId],
    queryFn: () => apiClient.communities.get({ id: communityId }),
  });

  // Fetch children
  const { data: childrenData, isLoading: childrenLoading } = useQuery({
    queryKey: ['group', communityId, 'children'],
    queryFn: () => apiClient.communities.listChildren({ parentId: communityId }),
  });

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Group Not Found</CardTitle>
            <CardDescription>The requested group could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Only Graduated groups can have children
  if (group.stage !== 'graduated') {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/communities/$communityId" params={{ communityId }}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Group
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Child Themes Not Available</CardTitle>
            <CardDescription>
              Only Graduated-stage groups can create child themes. Upgrade to Graduated stage to
              enable this feature.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const children = childrenData?.children || [];
  const getStageBadgeVariant = (stage: string) => {
    switch (stage) {
      case 'theme':
        return 'secondary' as const;
      case 'community':
        return 'default' as const;
      case 'graduated':
        return 'outline' as const; // Use 'outline' instead of 'success'
      default:
        return 'default' as const;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/communities/$communityId" params={{ communityId }}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {group.name}
            </Button>
          </Link>
        </div>
        <CreateChildTheme
          parentId={communityId}
          parentName={group.name}
          parentStage={group.stage}
        />
      </div>

      {/* Hierarchy Overview */}
      <GroupHierarchy groupId={communityId} />

      {/* Children List */}
      <Card>
        <CardHeader>
          <CardTitle>Child Themes</CardTitle>
          <CardDescription>
            {children.length === 0
              ? 'No child themes yet. Create one to get started.'
              : `${children.length} child ${children.length === 1 ? 'theme' : 'themes'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {childrenLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No child themes yet. Create one to organize discussions into focused topics.
              </p>
              <CreateChildTheme
                parentId={communityId}
                parentName={group.name}
                parentStage={group.stage}
              />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {children.map((child) => (
                <Link
                  key={child.id}
                  to="/communities/$communityId"
                  params={{ communityId: child.id }}
                  className="block"
                >
                  <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{child.name}</CardTitle>
                        <Badge variant={getStageBadgeVariant(child.stage)}>{child.stage}</Badge>
                      </div>
                      {child.description && (
                        <CardDescription className="line-clamp-2">
                          {child.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{child.memberCount} members</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
