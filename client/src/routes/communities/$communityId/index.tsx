import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { CommunityDetail } from '@/components/communities/CommunityDetail';
import { CommunityFeed } from '@/components/feeds/CommunityFeed';
import { PostCreator } from '@/components/posts/PostCreator';
import { PostList } from '@/components/posts/PostList';
import { useCommunity } from '@/lib/hooks';

export const Route = createFileRoute('/communities/$communityId/')({
  component: CommunityDetailPage,
});

function CommunityDetailPage() {
  const { communityId } = Route.useParams();
  const { data: community, isLoading } = useCommunity(communityId);
  const [feeds] = useState<never[]>([]); // TODO: Implement useFeeds hook

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading community...</div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Community not found</div>
      </div>
    );
  }

  const handleCreateFeed = () => {
    // TODO: Implement feed creation
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Community Info */}
        <div className="lg:col-span-1">
          <CommunityDetail
            community={community}
            feeds={feeds}
            loading={false}
            error={null}
            onCreateFeedClick={handleCreateFeed}
          />
        </div>

        {/* Right Column: Posts Timeline (014-bluesky) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Creator (if user is member) */}
          {/* TODO: Add membership check - for now, show to all */}
          <PostCreator communityId={communityId} />

          {/* Post List */}
          <PostList communityId={communityId} />

          {/* Legacy Community Feed (deprecated) */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Legacy Feed (Deprecated)</h2>
            <CommunityFeed communityId={communityId} />
          </div>
        </div>
      </div>
    </div>
  );
}
