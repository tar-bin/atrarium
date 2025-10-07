import type { BskyAgent } from '@atproto/api';
import { useNavigate } from '@tanstack/react-router';
import { Hash, LogIn, Plus, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { CreatePostForm } from '@/components/posts/CreatePostForm';
import { PostList } from '@/components/posts/PostList';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Feed, Post } from '@/types';

interface FeedDetailProps {
  feed: Feed;
  posts: Post[];
  isAuthenticated: boolean;
  agent: BskyAgent | null;
  communityName?: string;
  communityId?: string;
}

export function FeedDetail({ feed, posts, isAuthenticated, agent }: FeedDetailProps) {
  const navigate = useNavigate();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const handlePostSuccess = (postUri: string) => {
    console.log('Post created:', postUri);
    setIsCreatePostOpen(false);
    // Parent component will handle refresh
  };

  const handleHidePost = async (uri: string) => {
    console.log('Hide post:', uri);
    // API call will be handled by parent
  };

  return (
    <>
      {/* Fixed Feed Info Header */}
      <div className="fixed top-0 left-64 right-0 bg-white border-b border-border z-10 transition-all group">
        <div className="mx-auto max-w-[600px] px-6 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1
                className="text-base font-semibold truncate"
                title={feed.description || feed.name}
              >
                {feed.name}
              </h1>
              {feed.description && (
                <div className="overflow-hidden transition-all duration-200 max-h-0 group-hover:max-h-10">
                  <p className="text-xs text-muted-foreground truncate pt-0.5">
                    {feed.description}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <code className="font-mono">{feed.hashtag}</code>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>{feed.posts7d}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{feed.activeUsers7d}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with top padding for fixed header */}
      <div className="mx-auto max-w-[600px] pt-[16px]">
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

      {/* Fixed Action Button (bottom right) */}
      {isAuthenticated ? (
        agent ? (
          <Button
            size="lg"
            onClick={() => setIsCreatePostOpen(true)}
            className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Post
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => navigate({ to: '/' })}
            className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Re-login to Post
          </Button>
        )
      ) : (
        <Button
          size="lg"
          onClick={() => navigate({ to: '/' })}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <LogIn className="mr-2 h-5 w-5" />
          Login to Post
        </Button>
      )}

      {/* Create Post Modal */}
      <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
          {agent && (
            <CreatePostForm
              agent={agent}
              feedHashtag={feed.hashtag}
              onSuccess={handlePostSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
