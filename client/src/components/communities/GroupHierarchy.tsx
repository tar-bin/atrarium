// GroupHierarchy Component (T034)
// Display parent-child tree view with stage badges and navigation

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Loader2, Users } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';

interface GroupHierarchyProps {
  groupId: string;
}

export function GroupHierarchy({ groupId }: GroupHierarchyProps) {
  // Fetch group details
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => apiClient.communities.get({ id: groupId }),
  });

  // Fetch children (if Graduated stage)
  const { data: childrenData, isLoading: childrenLoading } = useQuery({
    queryKey: ['group', groupId, 'children'],
    queryFn: () => apiClient.communities.listChildren({ parentId: groupId }),
    enabled: group?.stage === 'graduated',
  });

  // Fetch parent (if Theme stage)
  const { data: parent, isLoading: parentLoading } = useQuery({
    queryKey: ['group', groupId, 'parent'],
    queryFn: () => apiClient.communities.getParent({ childId: groupId }),
    enabled: group?.stage === 'theme',
  });

  if (groupLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!group) {
    return null;
  }

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

  const children = childrenData?.children || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hierarchy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parent Link (Theme only) */}
        {group.stage === 'theme' && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Parent Group</h3>
            {parentLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading parent...</span>
              </div>
            ) : parent ? (
              <Link
                to="/communities/$communityId"
                params={{ communityId: parent.id }}
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{parent.name}</h4>
                    <Badge variant={getStageBadgeVariant(parent.stage)}>{parent.stage}</Badge>
                  </div>
                  {parent.description && (
                    <p className="text-sm text-muted-foreground mt-1">{parent.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{parent.memberCount}</span>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No parent group</p>
            )}
          </div>
        )}

        {/* Children List (Graduated only) */}
        {group.stage === 'graduated' && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Child Themes</h3>
            {childrenLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading children...</span>
              </div>
            ) : children.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="children" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2">
                    <span className="text-sm">
                      {children.length} child {children.length === 1 ? 'theme' : 'themes'}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {children.map((child) => (
                        <Link
                          key={child.id}
                          to="/communities/$communityId"
                          params={{ communityId: child.id }}
                          className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{child.name}</h4>
                              <Badge variant={getStageBadgeVariant(child.stage)}>
                                {child.stage}
                              </Badge>
                            </div>
                            {child.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {child.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{child.memberCount}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <p className="text-sm text-muted-foreground">
                No child themes yet. Create one to get started.
              </p>
            )}
          </div>
        )}

        {/* Community Stage (no hierarchy) */}
        {group.stage === 'community' && (
          <p className="text-sm text-muted-foreground">
            Community-stage groups cannot have parents or children. Upgrade to Graduated to create
            child themes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
