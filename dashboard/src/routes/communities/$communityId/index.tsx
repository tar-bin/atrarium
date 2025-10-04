import { createFileRoute, redirect } from '@tanstack/react-router';
import { CommunityDetail } from '@/components/communities/CommunityDetail';
import { CommunitySettings } from '@/components/communities/CommunitySettings';
import { CreateFeedModal } from '@/components/feeds/CreateFeedModal';
import { useState } from 'react';
import type { Feed } from '@/types';
import { isAuthenticated } from '@/lib/auth';

export const Route = createFileRoute('/communities/$communityId/')({
  beforeLoad: ({ params }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/',
        search: { redirect: `/communities/${params.communityId}` },
      });
    }
  },
  component: CommunityDetailPage,
});

function CommunityDetailPage() {
  const { communityId } = Route.useParams();
  const [isCreateFeedModalOpen, setIsCreateFeedModalOpen] = useState(false);

  // TODO: Replace with TanStack Query in Phase 3.6
  const mockCommunity = {
    id: communityId,
    name: 'Test Community',
    description: 'A test community',
    stage: 'theme' as const,
    parentId: null,
    ownerDid: 'did:plc:owner',
    memberCount: 5,
    postCount: 10,
    createdAt: Math.floor(Date.now() / 1000),
    graduatedAt: null,
    archivedAt: null,
  };

  const mockFeeds: Feed[] = [];
  const loading = false;
  const error = null;
  const currentUserDid = 'did:plc:owner'; // TODO: Get from PDS context
  const isOwner = currentUserDid === mockCommunity.ownerDid;

  const handleCreateFeed = async (data: {
    name: string;
    description: string;
  }): Promise<Feed> => {
    console.log('Creating feed:', data);
    // TODO: Implement API call with TanStack Query mutation
    const newFeed: Feed = {
      id: 'feed-1',
      communityId,
      name: data.name,
      description: data.description,
      status: 'active',
      hashtag: '#atr_abc12345',
      posts7d: 0,
      activeUsers7d: 0,
      lastPostAt: null,
      createdAt: Math.floor(Date.now() / 1000),
    };
    setIsCreateFeedModalOpen(false);
    return newFeed;
  };

  const handleUpdateCommunity = async (data: { name: string; description: string }) => {
    console.log('Updating community:', data);
    // TODO: Implement API call with TanStack Query mutation
  };

  const handleCloseCommunity = async () => {
    console.log('Closing community');
    // TODO: Implement API call with TanStack Query mutation, then redirect
  };

  return (
    <div className="space-y-6">
      <CommunityDetail
        community={mockCommunity}
        feeds={mockFeeds}
        loading={loading}
        error={error}
        onCreateFeedClick={() => setIsCreateFeedModalOpen(true)}
      />

      {isOwner && (
        <CommunitySettings
          community={mockCommunity}
          isOwner={isOwner}
          onUpdate={handleUpdateCommunity}
          onClose={handleCloseCommunity}
        />
      )}

      <CreateFeedModal
        isOpen={isCreateFeedModalOpen}
        onClose={() => setIsCreateFeedModalOpen(false)}
        onSubmit={handleCreateFeed}
      />
    </div>
  );
}
