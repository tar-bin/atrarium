import { Feed } from '@/types';
import { FeedCard } from './FeedCard';

interface FeedListProps {
  feeds: Feed[];
  loading: boolean;
  error?: string | null;
}

export function FeedList({ feeds, loading, error }: FeedListProps) {
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

  if (feeds.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No feeds yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {feeds.map((feed) => (
        <FeedCard
          key={feed.id}
          feed={feed}
          onClick={() => {
            // Navigation will be handled by parent/router
            console.log('Navigate to feed:', feed.id);
          }}
        />
      ))}
    </div>
  );
}
