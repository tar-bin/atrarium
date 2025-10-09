import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { FeedPagination } from './FeedPagination';
import { FeedPost } from './FeedPost';

interface CommunityFeedProps {
  communityId: string;
  limit?: number;
}

interface Post {
  uri: string;
  cid: string;
  author: string;
  text: string;
  createdAt: string;
}

export function CommunityFeed({ communityId, limit: _limit = 20 }: CommunityFeedProps) {
  const [_cursor, _setCursor] = useState<string | undefined>();

  // TODO: Implement actual API call using TanStack Query
  const { data, isLoading, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ['community-feed', communityId],
    queryFn: async ({ pageParam: _pageParam }) => {
      // GET /api/feeds/:communityId?limit=20&cursor=...
      return { feed: [] as Post[], cursor: undefined };
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: undefined,
  });

  const posts = data?.pages.flatMap((page) => page.feed) ?? [];

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading feed...</div>;
  }

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <p>No posts yet. Be the first to post!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <FeedPost key={post.uri} post={post} communityId={communityId} />
      ))}

      {hasNextPage && (
        <FeedPagination
          onLoadMore={() => fetchNextPage()}
          hasMore={hasNextPage}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
