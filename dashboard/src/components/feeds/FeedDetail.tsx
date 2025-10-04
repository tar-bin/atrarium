import { Feed, Post } from '@/types';
import type { BskyAgent } from '@atproto/api';
import { PostList } from '@/components/posts/PostList';
import { CreatePostForm } from '@/components/posts/CreatePostForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hash, TrendingUp, Users } from 'lucide-react';

interface FeedDetailProps {
  feed: Feed;
  posts: Post[];
  isAuthenticated: boolean;
  agent: BskyAgent | null;
}

export function FeedDetail({ feed, posts, isAuthenticated, agent }: FeedDetailProps) {
  const handlePostSuccess = (postUri: string) => {
    console.log('Post created:', postUri);
    // Parent component will handle refresh
  };

  const handleHidePost = async (uri: string) => {
    console.log('Hide post:', uri);
    // API call will be handled by parent
  };

  return (
    <div className="space-y-6">
      {/* Feed Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{feed.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feed.description && (
            <p className="text-muted-foreground">{feed.description}</p>
          )}

          {/* Hashtag */}
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <code className="text-sm font-mono">{feed.hashtag}</code>
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>{feed.posts7d} posts (7d)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{feed.activeUsers7d} active users (7d)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Post Form */}
      {isAuthenticated && agent ? (
        <CreatePostForm feedHashtag={feed.hashtag} onSuccess={handlePostSuccess} />
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">
              Login to post to this feed
            </p>
          </CardContent>
        </Card>
      )}

      {/* Post List */}
      <div data-testid="post-list">
        <PostList
          posts={posts}
          loading={false}
          error={null}
          currentUserDid={null}
          canModerate={false}
          onHidePost={handleHidePost}
        />
      </div>
    </div>
  );
}
