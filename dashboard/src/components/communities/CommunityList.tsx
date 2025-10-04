import { Community } from '@/types';
import { CommunityCard } from './CommunityCard';
import { Button } from '@/components/ui/button';

interface CommunityListProps {
  communities: Community[];
  loading: boolean;
  error: string | null;
  onCreateClick: () => void;
}

export function CommunityList({
  communities,
  loading,
  error,
  onCreateClick,
}: CommunityListProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Communities</h2>
        <Button onClick={onCreateClick}>Create Community</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {communities.map((community) => (
          <CommunityCard
            key={community.id}
            community={community}
            onClick={() => {
              // Navigation will be handled by parent/router
              console.log('Navigate to community:', community.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}
