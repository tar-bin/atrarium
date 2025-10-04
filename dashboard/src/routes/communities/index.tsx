import { createFileRoute, redirect } from '@tanstack/react-router';
import { CommunityList } from '@/components/communities/CommunityList';
import { CreateCommunityModal } from '@/components/communities/CreateCommunityModal';
import { useState } from 'react';
import type { Community } from '@/types';
import { isAuthenticated } from '@/lib/auth';

export const Route = createFileRoute('/communities/')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/',
        search: { redirect: '/communities' },
      });
    }
  },
  component: CommunitiesPage,
});

function CommunitiesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // TODO: Replace with TanStack Query in Phase 3.6
  // Using mock data based on seeds/dev-data.sql
  const mockCommunities: Community[] = [
    {
      id: 'comm-anime-lovers',
      name: 'Anime Lovers',
      description: 'A community for anime enthusiasts to discuss their favorite shows',
      stage: 'theme',
      memberCount: 15,
      postCount: 245,
      feedMixOwn: 1.0,
      feedMixParent: 0.0,
      feedMixGlobal: 0.0,
      createdAt: 1704067200,
    },
    {
      id: 'comm-tech-news',
      name: 'Tech News',
      description: 'Latest technology news and discussions',
      stage: 'theme',
      memberCount: 32,
      postCount: 478,
      feedMixOwn: 1.0,
      feedMixParent: 0.0,
      feedMixGlobal: 0.0,
      createdAt: 1704153600,
    },
    {
      id: 'comm-game-dev',
      name: 'Game Development',
      description: 'Indie game developers sharing knowledge and progress',
      stage: 'theme',
      memberCount: 28,
      postCount: 312,
      feedMixOwn: 1.0,
      feedMixParent: 0.0,
      feedMixGlobal: 0.0,
      createdAt: 1704240000,
    },
    {
      id: 'comm-anime-manga',
      name: 'Manga Discussion',
      description: 'Focused discussion on manga and light novels',
      stage: 'community',
      parentId: 'comm-anime-lovers',
      memberCount: 8,
      postCount: 89,
      feedMixOwn: 0.5,
      feedMixParent: 0.3,
      feedMixGlobal: 0.2,
      createdAt: 1704326400,
    },
    {
      id: 'comm-web3-builders',
      name: 'Web3 Builders',
      description: 'Decentralized web developers and blockchain enthusiasts',
      stage: 'graduated',
      memberCount: 156,
      postCount: 2890,
      feedMixOwn: 0.5,
      feedMixParent: 0.0,
      feedMixGlobal: 0.5,
      createdAt: 1701388800,
    },
  ];
  const loading = false;
  const error = null;

  const handleCreateCommunity = async (data: { name: string; description: string }) => {
    console.log('Creating community:', data);
    // TODO: Implement API call with TanStack Query mutation
    setIsCreateModalOpen(false);
  };

  return (
    <div>
      <CommunityList
        communities={mockCommunities}
        loading={loading}
        error={error}
        onCreateClick={() => setIsCreateModalOpen(true)}
      />

      <CreateCommunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCommunity}
      />
    </div>
  );
}
