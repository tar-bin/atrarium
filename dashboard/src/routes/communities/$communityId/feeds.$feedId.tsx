import { createFileRoute, redirect } from '@tanstack/react-router';
import { FeedDetail } from '@/components/feeds/FeedDetail';
import type { Feed, Post } from '@/types';
import { isAuthenticated } from '@/lib/auth';

export const Route = createFileRoute('/communities/$communityId/feeds/$feedId')({
  beforeLoad: ({ params }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/',
        search: { redirect: `/communities/${params.communityId}/feeds/${params.feedId}` },
      });
    }
  },
  component: FeedDetailPage,
});

function FeedDetailPage() {
  const { communityId, feedId } = Route.useParams();

  // TODO: Replace with TanStack Query in Phase 3.6
  const mockFeed: Feed = {
    id: feedId,
    communityId,
    name: 'General Discussion',
    description: 'General discussions about everything',
    status: 'active',
    hashtag: '#atr_abc12345',
    posts7d: 10,
    activeUsers7d: 5,
    lastPostAt: Math.floor(Date.now() / 1000),
    createdAt: Math.floor(Date.now() / 1000),
  };

  const mockPosts: Post[] = [];
  const isAuthenticated = false; // TODO: Get from PDS context
  const agent = null; // TODO: Get from PDS context

  return (
    <FeedDetail
      feed={mockFeed}
      posts={mockPosts}
      isAuthenticated={isAuthenticated}
      agent={agent}
    />
  );
}
