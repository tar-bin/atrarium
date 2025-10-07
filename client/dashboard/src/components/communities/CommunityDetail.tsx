import type { Community, Feed } from '@/types';
import { FeedList } from '@/components/feeds/FeedList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText } from 'lucide-react';

interface CommunityDetailProps {
  community: Community;
  feeds: Feed[];
  loading: boolean;
  error: string | null;
  onCreateFeedClick: () => void;
}

export function CommunityDetail({
  community,
  feeds,
  loading,
  error,
  onCreateFeedClick,
}: CommunityDetailProps) {
  return (
    <div className="space-y-6">
      {/* Community Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{community.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {community.description && (
            <p className="mb-4 text-muted-foreground">{community.description}</p>
          )}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{community.memberCount} members</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{community.postCount} posts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feeds Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Feeds</h3>
          <Button onClick={onCreateFeedClick}>Create Feed</Button>
        </div>

        <FeedList feeds={feeds} loading={loading} error={error} />
      </div>
    </div>
  );
}
