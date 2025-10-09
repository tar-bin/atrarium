// ReactionBar Component Tests (T029)
// Feature: 016-slack-mastodon-misskey

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactionBar } from '../../../src/components/reactions/ReactionBar';
import * as api from '../../../src/lib/api';

// Mock API module
vi.mock('../../../src/lib/api', () => ({
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  listReactions: vi.fn(),
}));

// Mock useReactionStream hook
vi.mock('../../../src/hooks/useReactionStream', () => ({
  useReactionStream: vi.fn(() => ({
    isConnected: true,
    error: null,
    reconnect: vi.fn(),
  })),
}));

describe('ReactionBar', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithQuery = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  const mockReactions = [
    {
      emoji: { type: 'unicode' as const, value: 'U+1F44D' },
      count: 5,
      reactors: ['did:plc:user1', 'did:plc:user2', 'did:plc:user3'],
      currentUserReacted: true,
    },
    {
      emoji: { type: 'unicode' as const, value: 'U+2764' },
      count: 3,
      reactors: ['did:plc:user4', 'did:plc:user5'],
      currentUserReacted: false,
    },
  ];

  it('renders loading state initially', () => {
    vi.mocked(api.listReactions).mockImplementation(
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentional never-resolving promise for loading state test
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQuery(
      <ReactionBar
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Check for loading skeleton
    expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
  });

  it('renders reaction buttons with correct counts', async () => {
    vi.mocked(api.listReactions).mockResolvedValue({ reactions: mockReactions });

    renderWithQuery(
      <ReactionBar
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Wait for reactions to load
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // Check reaction buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('highlights current user reactions', async () => {
    vi.mocked(api.listReactions).mockResolvedValue({ reactions: mockReactions });

    renderWithQuery(
      <ReactionBar
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Wait for reactions to load
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    // Find thumbs up button (currentUserReacted = true)
    const thumbsUpButton = screen.getByText('5').closest('button');
    expect(thumbsUpButton).toHaveClass('bg-blue-100', 'border-blue-500');
  });

  it('shows tooltip with reactor count on hover', async () => {
    vi.mocked(api.listReactions).mockResolvedValue({ reactions: mockReactions });

    renderWithQuery(
      <ReactionBar
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Wait for reactions to load
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    // Check title attribute (tooltip)
    const thumbsUpButton = screen.getByText('5').closest('button');
    expect(thumbsUpButton).toHaveAttribute('title', '3 reactions');
  });

  it('calls addReaction when non-reacted emoji is clicked', async () => {
    vi.mocked(api.listReactions).mockResolvedValue({ reactions: mockReactions });
    vi.mocked(api.addReaction).mockResolvedValue({ success: true });

    const postUri = 'at://did:plc:test/app.bsky.feed.post/123';
    renderWithQuery(<ReactionBar postUri={postUri} communityId="test-community" />);

    // Wait for reactions to load
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // Click heart emoji (currentUserReacted = false)
    const heartButton = screen.getByText('3').closest('button');
    if (heartButton) {
      fireEvent.click(heartButton);

      // Verify addReaction was called
      await waitFor(() => {
        expect(api.addReaction).toHaveBeenCalledWith(postUri, {
          type: 'unicode',
          value: 'U+2764',
        });
      });
    }
  });

  it('shows "Show More" button when more than 20 emoji types', async () => {
    // Create 21 unique emoji reactions
    const manyReactions = Array.from({ length: 21 }, (_, i) => ({
      emoji: { type: 'unicode' as const, value: `U+${i.toString(16).padStart(4, '0')}` },
      count: 1,
      reactors: ['did:plc:user1'],
      currentUserReacted: false,
    }));

    vi.mocked(api.listReactions).mockResolvedValue({ reactions: manyReactions });

    renderWithQuery(
      <ReactionBar
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Wait for reactions to load
    await waitFor(() => {
      expect(screen.getByText(/Show More \(\+1\)/)).toBeInTheDocument();
    });
  });

  it('opens modal when "Show More" button is clicked', async () => {
    // Create 21 unique emoji reactions
    const manyReactions = Array.from({ length: 21 }, (_, i) => ({
      emoji: { type: 'unicode' as const, value: `U+${i.toString(16).padStart(4, '0')}` },
      count: 1,
      reactors: ['did:plc:user1'],
      currentUserReacted: false,
    }));

    vi.mocked(api.listReactions).mockResolvedValue({ reactions: manyReactions });

    renderWithQuery(
      <ReactionBar
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Wait for "Show More" button
    await waitFor(() => {
      expect(screen.getByText(/Show More/)).toBeInTheDocument();
    });

    // Click "Show More" button
    const showMoreButton = screen.getByText(/Show More/);
    fireEvent.click(showMoreButton);

    // Verify modal opened (check for modal title or content)
    await waitFor(() => {
      expect(screen.getByText('All Reactions')).toBeInTheDocument();
    });
  });

  it('returns null when no reactions exist', async () => {
    vi.mocked(api.listReactions).mockResolvedValue({ reactions: [] });

    const { container } = renderWithQuery(
      <ReactionBar
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('disables buttons during mutation', async () => {
    vi.mocked(api.listReactions).mockResolvedValue({ reactions: mockReactions });
    vi.mocked(api.addReaction).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    );

    renderWithQuery(
      <ReactionBar
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Wait for reactions to load
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // Click heart emoji
    const heartButton = screen.getByText('3').closest('button');
    if (heartButton) {
      fireEvent.click(heartButton);

      // Check that button is disabled during mutation
      await waitFor(() => {
        expect(heartButton).toBeDisabled();
      });
    }
  });
});
