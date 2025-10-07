import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { CommunityDetail } from '@/components/communities/CommunityDetail';
import { CommunitySettings } from '@/components/communities/CommunitySettings';
import { CreateFeedModal } from '@/components/feeds/CreateFeedModal';
import { isAuthenticated } from '@/lib/auth';
import type { Feed } from '@/types';

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
  // Mock community data based on seeds/dev-data.sql
  const communityData: Record<string, any> = {
    'comm-anime-lovers': {
      id: 'comm-anime-lovers',
      name: 'Anime Lovers',
      description: 'A community for anime enthusiasts to discuss their favorite shows',
      stage: 'theme' as const,
      memberCount: 15,
      postCount: 245,
      ownerDid: 'did:plc:owner123',
      createdAt: 1704067200,
      feeds: [
        {
          id: 'feed-anime-general',
          communityId: 'comm-anime-lovers',
          name: 'General Anime Talk',
          description: 'General anime discussions and recommendations',
          hashtag: '#atr_a1b2c3d4',
          status: 'active' as const,
          posts7d: 42,
          activeUsers7d: 12,
          createdAt: 1704067200,
        },
        {
          id: 'feed-anime-seasonal',
          communityId: 'comm-anime-lovers',
          name: 'Seasonal Anime',
          description: 'Current season anime episode discussions',
          hashtag: '#atr_e5f6g7h8',
          status: 'active' as const,
          posts7d: 68,
          activeUsers7d: 15,
          createdAt: 1704153600,
        },
      ],
    },
    'comm-tech-news': {
      id: 'comm-tech-news',
      name: 'Tech News',
      description: 'Latest technology news and discussions',
      stage: 'theme' as const,
      memberCount: 32,
      postCount: 478,
      ownerDid: 'did:plc:owner456',
      createdAt: 1704153600,
      feeds: [
        {
          id: 'feed-tech-ai',
          communityId: 'comm-tech-news',
          name: 'AI & Machine Learning',
          description: 'Artificial intelligence and ML developments',
          hashtag: '#atr_i9j0k1l2',
          status: 'active' as const,
          posts7d: 95,
          activeUsers7d: 28,
          createdAt: 1704067200,
        },
        {
          id: 'feed-tech-web',
          communityId: 'comm-tech-news',
          name: 'Web Development',
          description: 'Frontend, backend, and full-stack web dev',
          hashtag: '#atr_m3n4o5p6',
          status: 'active' as const,
          posts7d: 78,
          activeUsers7d: 24,
          createdAt: 1704153600,
        },
      ],
    },
    'comm-game-dev': {
      id: 'comm-game-dev',
      name: 'Game Development',
      description: 'Indie game developers sharing knowledge and progress',
      stage: 'theme' as const,
      memberCount: 28,
      postCount: 312,
      ownerDid: 'did:plc:owner789',
      createdAt: 1704240000,
      feeds: [
        {
          id: 'feed-game-unity',
          communityId: 'comm-game-dev',
          name: 'Unity Tips',
          description: 'Unity engine tips and tricks',
          hashtag: '#atr_q7r8s9t0',
          status: 'active' as const,
          posts7d: 45,
          activeUsers7d: 18,
          createdAt: 1704067200,
        },
        {
          id: 'feed-game-pixel',
          communityId: 'comm-game-dev',
          name: 'Pixel Art',
          description: 'Pixel art and sprite creation',
          hashtag: '#atr_u1v2w3x4',
          status: 'active' as const,
          posts7d: 38,
          activeUsers7d: 14,
          createdAt: 1704153600,
        },
      ],
    },
  };

  const mockCommunity = communityData[communityId] || {
    id: communityId,
    name: 'Community Not Found',
    description: '',
    stage: 'theme' as const,
    memberCount: 0,
    postCount: 0,
    ownerDid: '',
    createdAt: Math.floor(Date.now() / 1000),
  };

  const mockFeeds: Feed[] = communityData[communityId]?.feeds || [];
  const loading = false;
  const error = null;
  const currentUserDid = 'did:plc:owner123'; // TODO: Get from PDS context
  const isOwner = currentUserDid === mockCommunity.ownerDid;

  const handleCreateFeed = async (data: { name: string; description: string }): Promise<Feed> => {
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
