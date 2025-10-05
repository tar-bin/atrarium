import { useState } from 'react';
import type { Community } from '@/types';
import { CommunityCard } from './CommunityCard';
import { Button } from '@/components/ui/button';

interface CommunityListProps {
  communities: Community[];
  loading: boolean;
  error: string | null;
  onCreateClick: () => void;
  currentUserDid?: string; // To determine ownership
}

type TabType = 'joined' | 'owned' | 'discover';

export function CommunityList({
  communities,
  loading,
  error,
  onCreateClick,
}: CommunityListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('joined');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  // For now, use simple logic to determine roles
  // TODO: Replace with actual membership role from API
  const getCommunityRole = (community: Community): 'owner' | 'moderator' | 'member' => {
    // Temporary logic: assume theme/community stage communities are owned
    if (community.stage === 'theme' || community.stage === 'community') {
      return 'owner';
    }
    return 'member';
  };

  const ownedCommunities = communities.filter(c => getCommunityRole(c) === 'owner');
  const joinedCommunities = communities; // All communities
  const discoverCommunities = communities.filter(c => getCommunityRole(c) === 'member' && c.stage === 'graduated');

  const displayedCommunities =
    activeTab === 'owned' ? ownedCommunities :
    activeTab === 'discover' ? discoverCommunities :
    joinedCommunities;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Communities</h2>
          {/* Tab buttons */}
          <div className="flex gap-1 rounded-md bg-muted p-1">
            <button
              onClick={() => setActiveTab('joined')}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                activeTab === 'joined'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Joined
            </button>
            <button
              onClick={() => setActiveTab('owned')}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                activeTab === 'owned'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Owned
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                activeTab === 'discover'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Discover
            </button>
          </div>
        </div>
        <Button onClick={onCreateClick}>Create Community</Button>
      </div>

      {displayedCommunities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground">
            {activeTab === 'owned' ? 'No owned communities' :
             activeTab === 'discover' ? 'No communities to discover' :
             'No joined communities'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {activeTab === 'owned'
              ? 'Create your first community to get started'
              : activeTab === 'discover'
              ? 'Check back later for new communities'
              : 'Join a community to see it here'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedCommunities.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              userRole={getCommunityRole(community)}
              onClick={() => {
                // Navigation will be handled by parent/router
                console.log('Navigate to community:', community.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
