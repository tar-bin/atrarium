import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listCommunities } from '@/lib/api';
import type { Community } from '@/types';
import { CommunityCard } from './CommunityCard';

interface CommunityBrowserProps {
  onCommunitySelect?: (community: Community) => void;
}

export function CommunityBrowser({ onCommunitySelect }: CommunityBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'theme' | 'community' | 'graduated'>(
    'all'
  );
  const [accessTypeFilter, setAccessTypeFilter] = useState<'all' | 'open' | 'invite-only'>('all');

  // Fetch communities from API
  const { data, isLoading } = useQuery({
    queryKey: ['communities'],
    queryFn: listCommunities,
  });

  const communities: Community[] = (data?.data || []).map((c) => ({
    ...c,
    ownerDid: '', // TODO: Extract from community config
    feedMixOwn: 1.0,
    feedMixParent: 0.0,
    feedMixGlobal: 0.0,
    graduatedAt: null,
    archivedAt: null,
    accessType: 'open' as const, // TODO: Get from community config
  }));

  const filteredCommunities = communities.filter((community) => {
    const matchesSearch = community.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'all' || community.stage === stageFilter;
    const matchesAccessType =
      accessTypeFilter === 'all' || community.accessType === accessTypeFilter;
    return matchesSearch && matchesStage && matchesAccessType;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <Input
          placeholder="Search communities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />

        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1">
            <span className="text-sm text-muted-foreground py-2">Stage:</span>
            <Button
              variant={stageFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStageFilter('all')}
            >
              All
            </Button>
            <Button
              variant={stageFilter === 'theme' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStageFilter('theme')}
            >
              Theme
            </Button>
            <Button
              variant={stageFilter === 'community' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStageFilter('community')}
            >
              Community
            </Button>
            <Button
              variant={stageFilter === 'graduated' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStageFilter('graduated')}
            >
              Graduated
            </Button>
          </div>

          <div className="flex gap-1">
            <span className="text-sm text-muted-foreground py-2">Access:</span>
            <Button
              variant={accessTypeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAccessTypeFilter('all')}
            >
              All
            </Button>
            <Button
              variant={accessTypeFilter === 'open' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAccessTypeFilter('open')}
            >
              Open
            </Button>
            <Button
              variant={accessTypeFilter === 'invite-only' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAccessTypeFilter('invite-only')}
            >
              Invite-only
            </Button>
          </div>
        </div>
      </div>

      {/* Community List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading communities...</div>
      ) : filteredCommunities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No communities found. Try adjusting your filters.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCommunities.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              onClick={() => onCommunitySelect?.(community)}
            />
          ))}
        </div>
      )}

      {/* Community Count */}
      {!isLoading && filteredCommunities.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredCommunities.length} of {communities.length} communities
        </div>
      )}
    </div>
  );
}
