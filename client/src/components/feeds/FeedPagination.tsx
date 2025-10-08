import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedPaginationProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export function FeedPagination({ onLoadMore, hasMore, isLoading }: FeedPaginationProps) {
  if (!hasMore) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">No more posts to load</div>
    );
  }

  return (
    <div className="flex justify-center py-4">
      <Button variant="outline" onClick={onLoadMore} disabled={isLoading} className="min-w-[200px]">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          'Load More'
        )}
      </Button>
    </div>
  );
}
