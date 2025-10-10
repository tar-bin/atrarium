import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { CommunityDetail } from '@/components/communities/CommunityDetail';
import { CommunityFeed } from '@/components/feeds/CommunityFeed';
import { CommunityPostList } from '@/components/posts/CommunityPostList';
import { PostCreator } from '@/components/posts/PostCreator';
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

  // Map API response to Community type with missing fields
  const communityWithDefaults = {
    ...community,
    parentId: null,
    ownerDid: '', // TODO: Get from community config
    feedMixOwn: 1.0,
    feedMixParent: 0.0,
    feedMixGlobal: 0.0,
    graduatedAt: null,
    archivedAt: null,
    accessType: 'open' as const,
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Community Info */}
        <div className="lg:col-span-1">
          <CommunityDetail
            community={communityWithDefaults}
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

          {/* Community Post List */}
          <CommunityPostList communityId={communityId} />

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
