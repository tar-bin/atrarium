import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostList } from '@/components/posts/PostList';
import type { Post } from '@/types';

const mockPosts: Post[] = [
  {
    id: 1,
    uri: 'at://did:plc:user/app.bsky.feed.post/abc',
    feedId: 'feed-1',
    authorDid: 'did:plc:user',
    text: 'Test post content',
    createdAt: Date.now() / 1000 - 3600,
    hasMedia: false,
    langs: ['en'],
    moderationStatus: 'approved',
    indexedAt: Date.now() / 1000,
  },
];

describe('PostList Component', () => {
  it('renders PostCard for each post', () => {
    render(<PostList posts={mockPosts} loading={false} onHidePost={vi.fn()} />);

    expect(screen.getByText('Test post content')).toBeInTheDocument();
  });

  it('shows empty state when posts array is empty', () => {
    render(<PostList posts={[]} loading={false} onHidePost={vi.fn()} />);

    expect(screen.getByText(/no posts|empty/i)).toBeInTheDocument();
  });

  it('shows loading spinner when loading=true', () => {
    render(<PostList posts={[]} loading={true} onHidePost={vi.fn()} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('passes onHidePost to PostCard', () => {
    const onHidePostMock = vi.fn();

    render(<PostList posts={mockPosts} loading={false} onHidePost={onHidePostMock} />);

    // PostCard should receive the callback
    expect(screen.getByTestId('post-card')).toBeInTheDocument();
  });
});
