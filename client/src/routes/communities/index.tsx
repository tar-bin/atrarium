import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { CommunityList } from '@/components/communities/CommunityList';
import { CreateCommunityModal } from '@/components/communities/CreateCommunityModal';
import { isAuthenticated } from '@/lib/auth';
import type { Community } from '@/types';

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
      parentId: null,
      ownerDid: 'did:plc:owner1',
      memberCount: 15,
      postCount: 245,
      feedMixOwn: 1.0,
      feedMixParent: 0.0,
      feedMixGlobal: 0.0,
      createdAt: 1704067200,
      graduatedAt: null,
      archivedAt: null,
    },
    {
      id: 'comm-tech-news',
      name: 'Tech News',
      description: 'Latest technology news and discussions',
      stage: 'theme',
      parentId: null,
      ownerDid: 'did:plc:owner2',
      memberCount: 32,
      postCount: 478,
      feedMixOwn: 1.0,
      feedMixParent: 0.0,
      feedMixGlobal: 0.0,
      createdAt: 1704153600,
      graduatedAt: null,
      archivedAt: null,
    },
    {
      id: 'comm-game-dev',
      name: 'Game Development',
      description: 'Indie game developers sharing knowledge and progress',
      stage: 'theme',
      parentId: null,
      ownerDid: 'did:plc:owner3',
      memberCount: 28,
      postCount: 312,
      feedMixOwn: 1.0,
      feedMixParent: 0.0,
      feedMixGlobal: 0.0,
      createdAt: 1704240000,
      graduatedAt: null,
      archivedAt: null,
    },
    {
      id: 'comm-anime-manga',
      name: 'Manga Discussion',
      description: 'Focused discussion on manga and light novels',
      stage: 'community',
      parentId: 'comm-anime-lovers',
      ownerDid: 'did:plc:owner4',
      memberCount: 8,
      postCount: 89,
      feedMixOwn: 0.5,
      feedMixParent: 0.3,
      feedMixGlobal: 0.2,
      createdAt: 1704326400,
      graduatedAt: null,
      archivedAt: null,
    },
    {
      id: 'comm-web3-builders',
      name: 'Web3 Builders',
      description: 'Decentralized web developers and blockchain enthusiasts',
      stage: 'graduated',
      parentId: null,
      ownerDid: 'did:plc:owner5',
      memberCount: 156,
      postCount: 2890,
      feedMixOwn: 0.5,
      feedMixParent: 0.0,
      feedMixGlobal: 0.5,
      createdAt: 1701388800,
      graduatedAt: 1704412800,
      archivedAt: null,
    },
  ];
  const loading = false;
  const error = null;

  const handleCreateCommunity = async (_data: { name: string; description: string }) => {
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
