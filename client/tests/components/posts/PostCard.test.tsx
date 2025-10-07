import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PostCard } from '@/components/posts/PostCard';
import type { Post } from '@/types';

const mockPost: Post = {
  id: 1,
  uri: 'at://did:plc:user123/app.bsky.feed.post/abc',
  feedId: 'feed-1',
  authorDid: 'did:plc:user123',
  text: 'This is a test post #atr_abc12345',
  createdAt: Date.now() / 1000 - 7200, // 2 hours ago
  hasMedia: true,
  langs: ['en'],
  moderationStatus: 'approved',
  indexedAt: Date.now() / 1000,
};

describe('PostCard Component', () => {
  it('displays author DID, text, and timestamp', () => {
    render(<PostCard post={mockPost} canModerate={false} onHide={vi.fn()} />);

    expect(screen.getByText(/did:plc:user123/i)).toBeInTheDocument();
    expect(screen.getByText('This is a test post #atr_abc12345')).toBeInTheDocument();
    expect(screen.getByText(/hours ago/i)).toBeInTheDocument();
  });

  it('shows "has media" indicator when hasMedia=true', () => {
    render(<PostCard post={mockPost} canModerate={false} onHide={vi.fn()} />);

    expect(screen.getByTestId('media-indicator')).toBeInTheDocument();
  });

  it('shows moderation status badge when hidden', () => {
    const hiddenPost = { ...mockPost, moderationStatus: 'hidden' as const };

    render(<PostCard post={hiddenPost} canModerate={true} onHide={vi.fn()} />);

    expect(screen.getByText(/hidden/i)).toBeInTheDocument();
  });

  it('"Hide" button shows confirmation dialog before calling onHide', async () => {
    const onHideMock = vi.fn();
    const user = userEvent.setup();

    render(<PostCard post={mockPost} canModerate={true} onHide={onHideMock} />);

    const hideButton = screen.getByRole('button', { name: /hide/i });
    await user.click(hideButton);

    // Confirmation dialog should appear
    expect(screen.getByText(/confirm|sure/i)).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /confirm|yes/i });
    await user.click(confirmButton);

    expect(onHideMock).toHaveBeenCalledWith(mockPost.uri);
  });

  it('"Hide" button only visible when canModerate=true', () => {
    render(<PostCard post={mockPost} canModerate={false} onHide={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /hide/i })).not.toBeInTheDocument();
  });
});
