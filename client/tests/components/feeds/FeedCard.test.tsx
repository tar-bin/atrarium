import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FeedCard } from '@/components/feeds/FeedCard';
import type { Feed } from '@/types';

const mockFeed: Feed = {
  id: 'feed-1',
  communityId: 'comm-1',
  name: 'Tech Talk',
  description: 'Technology discussions',
  status: 'active',
  hashtag: '#atr_abc12345',
  posts7d: 25,
  activeUsers7d: 12,
  lastPostAt: Date.now() / 1000,
  createdAt: Date.now() / 1000,
};

describe('FeedCard Component', () => {
  it('displays feed name, hashtag, and stats', () => {
    render(<FeedCard feed={mockFeed} onClick={vi.fn()} />);

    expect(screen.getByText('Tech Talk')).toBeInTheDocument();
    expect(screen.getByText('#atr_abc12345')).toBeInTheDocument();
    expect(screen.getByText(/25.*posts/i)).toBeInTheDocument();
    expect(screen.getByText(/12.*users/i)).toBeInTheDocument();
  });

  it('copy button copies hashtag to clipboard', async () => {
    const user = userEvent.setup();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<FeedCard feed={mockFeed} onClick={vi.fn()} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('atr_abc12345');
  });

  it('onClick callback triggers when card clicked', async () => {
    const onClickMock = vi.fn();
    const user = userEvent.setup();

    render(<FeedCard feed={mockFeed} onClick={onClickMock} />);

    const card = screen.getByRole('button', { name: /tech talk/i });
    await user.click(card);

    expect(onClickMock).toHaveBeenCalledOnce();
  });
});
