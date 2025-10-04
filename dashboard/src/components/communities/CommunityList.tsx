import type { Community } from '@/types';
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

      {communities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground">No communities found</p>
          <p className="text-sm text-muted-foreground mt-2">Create your first community to get started</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
