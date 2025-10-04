import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedDetail } from '@/components/feeds/FeedDetail';
import type { Feed, Post } from '@/types';

const mockFeed: Feed = {
  id: 'feed-1',
  communityId: 'comm-1',
  name: 'General',
  description: 'General discussions',
  status: 'active',
  hashtag: '#atr_abc12345',
  posts7d: 10,
  activeUsers7d: 5,
  lastPostAt: Date.now() / 1000,
  createdAt: Date.now() / 1000,
};

const mockPosts: Post[] = [];

describe('FeedDetail Component', () => {
  it('displays feed info (name, hashtag, stats)', () => {
    render(
      <FeedDetail feed={mockFeed} posts={mockPosts} isAuthenticated={false} agent={null} />
    );

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('#atr_abc12345')).toBeInTheDocument();
  });

  it('renders PostList component', () => {
    render(
      <FeedDetail feed={mockFeed} posts={mockPosts} isAuthenticated={false} agent={null} />
    );

    expect(screen.getByTestId('post-list')).toBeInTheDocument();
  });

  it('renders CreatePostForm when authenticated', () => {
    render(
      <FeedDetail feed={mockFeed} posts={mockPosts} isAuthenticated={true} agent={{} as any} />
    );

    expect(screen.getByRole('textbox', { name: /post/i })).toBeInTheDocument();
  });

  it('shows "Login to post" message when not authenticated', () => {
    render(
      <FeedDetail feed={mockFeed} posts={mockPosts} isAuthenticated={false} agent={null} />
    );

    expect(screen.getByText(/login to post/i)).toBeInTheDocument();
  });
});
