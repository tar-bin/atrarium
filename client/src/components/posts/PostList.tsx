// PostList Component (Legacy - app.bsky.feed.post)
// Display Bluesky posts in a list

import type { Post } from '@/types';
import { PostCard } from './PostCard';

interface PostListProps {
  posts: Post[];
  loading: boolean;
  error: string | null;
  currentUserDid: string | null; // Kept for API compatibility with FeedDetail
  canModerate: boolean;
  onHidePost: (uri: string) => Promise<void>;
}

export function PostList({ posts, loading, error, canModerate, onHidePost }: PostListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.uri} post={post} canModerate={canModerate} onHide={onHidePost} />
      ))}
    </div>
  );
}
