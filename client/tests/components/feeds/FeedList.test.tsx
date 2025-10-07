import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedList } from '@/components/feeds/FeedList';
import type { Feed } from '@/types';

const mockFeeds: Feed[] = [
  {
    id: 'feed-1',
    communityId: 'comm-1',
    name: 'General Discussion',
    description: null,
    status: 'active',
    hashtag: '#atr_abc12345',
    posts7d: 10,
    activeUsers7d: 5,
    lastPostAt: Date.now() / 1000,
    createdAt: Date.now() / 1000,
  },
];

describe('FeedList Component', () => {
  it('renders FeedCard for each feed', () => {
    render(<FeedList feeds={mockFeeds} loading={false} />);

    expect(screen.getByText('General Discussion')).toBeInTheDocument();
    expect(screen.getByText('#atr_abc12345')).toBeInTheDocument();
  });

  it('shows empty state when feeds array is empty', () => {
    render(<FeedList feeds={[]} loading={false} />);

    expect(screen.getByText(/no feeds|empty/i)).toBeInTheDocument();
  });

  it('shows loading spinner when loading=true', () => {
    render(<FeedList feeds={[]} loading={true} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
