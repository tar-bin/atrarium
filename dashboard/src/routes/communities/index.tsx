import { createFileRoute } from '@tanstack/react-router';
import { CommunityList } from '@/components/communities/CommunityList';
import { CreateCommunityModal } from '@/components/communities/CreateCommunityModal';
import { useState } from 'react';

export const Route = createFileRoute('/communities/')({
  component: CommunitiesPage,
});

function CommunitiesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // TODO: Replace with TanStack Query in Phase 3.6
  const mockCommunities = [];
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
