// PostList Component (014-bluesky: Custom Lexicon Posts)
// Display community posts in reverse chronological order

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { apiClient } from '../../lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface PostListProps {
  communityId: string;
}

export function PostList({ communityId }: PostListProps) {
  const [cursor, setCursor] = useState<string | null>(null);

  const {
    data: postsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['posts', communityId, cursor],
    queryFn: async () => {
      const result = await apiClient.posts.list({
        communityId,
        limit: 50,
        cursor: cursor || undefined,
      });
      return result;
    },
  });

  const handleLoadMore = () => {
    if (postsData?.cursor) {
      setCursor(postsData.cursor);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">Loading posts...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-destructive">
          Error loading posts: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (!postsData || postsData.posts.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {postsData.posts.map((post) => (
        <Card key={post.uri}>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              {/* Author Avatar */}
              <Avatar>
                <AvatarImage src={post.author.avatar || undefined} alt={post.author.handle} />
                <AvatarFallback>
                  {post.author.displayName?.[0]?.toUpperCase() ||
                    post.author.handle[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Post Content */}
              <div className="flex-1 space-y-2">
                {/* Author Info */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {post.author.displayName || post.author.handle}
                  </span>
                  <span className="text-sm text-muted-foreground">@{post.author.handle}</span>
                  <span className="text-sm text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                </div>

                {/* Post Text */}
                <p className="whitespace-pre-wrap break-words">{post.text}</p>

                {/* Moderation Status (if hidden) */}
                {post.moderationStatus === 'hidden' && (
                  <p className="text-sm text-muted-foreground italic">
                    (This post is hidden by moderators)
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Load More Button */}
      {postsData.cursor && (
        <div className="flex justify-center py-4">
          <Button variant="outline" onClick={handleLoadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
