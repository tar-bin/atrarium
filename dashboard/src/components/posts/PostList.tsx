import type { Post } from '@/types';
import { PostCard } from './PostCard';

interface PostListProps {
  posts: Post[];
  loading: boolean;
  error?: string | null;
  currentUserDid?: string | null;
  canModerate?: boolean;
  onHidePost: (uri: string) => Promise<void>;
}

export function PostList({
  posts,
  loading,
  error,
  canModerate = false,
  onHidePost,
}: PostListProps) {
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

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.uri} data-testid="post-card">
          <PostCard post={post} canModerate={canModerate} onHide={onHidePost} />
        </div>
      ))}
    </div>
  );
}
