// ReactionPicker Component Tests (T028)
// Feature: 016-slack-mastodon-misskey

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactionPicker } from '../../../src/components/reactions/ReactionPicker';
import * as api from '../../../src/lib/api';

// Mock API module
vi.mock('../../../src/lib/api', () => ({
  addReaction: vi.fn(),
}));

describe('ReactionPicker', () => {
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

  it('renders emoji grid with 10 common emojis', () => {
    renderWithQuery(<ReactionPicker postUri="at://did:plc:test/app.bsky.feed.post/123" />);

    // Check header
    expect(screen.getByText('Pick a reaction')).toBeInTheDocument();

    // Check close button
    expect(screen.getByLabelText('Close')).toBeInTheDocument();

    // Check emojis (10 common emojis)
    const emojiButtons = screen.getAllByRole('button').filter((btn) => btn.title);
    expect(emojiButtons.length).toBeGreaterThanOrEqual(10);

    // Verify specific emojis
    expect(screen.getByTitle('Thumbs Up')).toBeInTheDocument();
    expect(screen.getByTitle('Heart')).toBeInTheDocument();
    expect(screen.getByTitle('Party')).toBeInTheDocument();
  });

  it('calls addReaction API when emoji is clicked', async () => {
    const mockAddReaction = vi.mocked(api.addReaction);
    mockAddReaction.mockResolvedValue({ success: true, reactionUri: 'at://...' });

    const postUri = 'at://did:plc:test/app.bsky.feed.post/123';
    renderWithQuery(<ReactionPicker postUri={postUri} />);

    // Click thumbs up emoji
    const thumbsUpButton = screen.getByTitle('Thumbs Up');
    fireEvent.click(thumbsUpButton);

    // Verify API call
    await waitFor(() => {
      expect(mockAddReaction).toHaveBeenCalledWith(postUri, {
        type: 'unicode',
        value: 'U+1F44D', // Thumbs up codepoint
      });
    });
  });

  it('shows loading state during mutation', async () => {
    const mockAddReaction = vi.mocked(api.addReaction);
    // Simulate slow API call
    mockAddReaction.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
    );

    renderWithQuery(<ReactionPicker postUri="at://did:plc:test/app.bsky.feed.post/123" />);

    // Click emoji
    const thumbsUpButton = screen.getByTitle('Thumbs Up');
    fireEvent.click(thumbsUpButton);

    // Check loading indicator
    await waitFor(() => {
      expect(screen.getByText('Adding reaction...')).toBeInTheDocument();
    });

    // Verify buttons are disabled during mutation
    expect(thumbsUpButton).toBeDisabled();
  });

  it('calls onClose callback after successful reaction', async () => {
    const mockAddReaction = vi.mocked(api.addReaction);
    mockAddReaction.mockResolvedValue({ success: true, reactionUri: 'at://...' });

    const onClose = vi.fn();
    renderWithQuery(
      <ReactionPicker postUri="at://did:plc:test/app.bsky.feed.post/123" onClose={onClose} />
    );

    // Click emoji
    const thumbsUpButton = screen.getByTitle('Thumbs Up');
    fireEvent.click(thumbsUpButton);

    // Wait for mutation to complete
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('closes picker when close button is clicked', () => {
    const onClose = vi.fn();
    renderWithQuery(
      <ReactionPicker postUri="at://did:plc:test/app.bsky.feed.post/123" onClose={onClose} />
    );

    // Click close button
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    // Verify callback called
    expect(onClose).toHaveBeenCalled();
  });

  it('closes picker when backdrop is clicked', () => {
    const onClose = vi.fn();
    renderWithQuery(
      <ReactionPicker postUri="at://did:plc:test/app.bsky.feed.post/123" onClose={onClose} />
    );

    // Click backdrop
    const backdrop = screen.getByLabelText('Close reaction picker');
    fireEvent.click(backdrop);

    // Verify callback called
    expect(onClose).toHaveBeenCalled();
  });

  it('closes picker when Escape key is pressed', () => {
    const onClose = vi.fn();
    renderWithQuery(
      <ReactionPicker postUri="at://did:plc:test/app.bsky.feed.post/123" onClose={onClose} />
    );

    // Press Escape
    const backdrop = screen.getByLabelText('Close reaction picker');
    fireEvent.keyDown(backdrop, { key: 'Escape' });

    // Verify callback called
    expect(onClose).toHaveBeenCalled();
  });

  it('invalidates reactions query on success', async () => {
    const mockAddReaction = vi.mocked(api.addReaction);
    mockAddReaction.mockResolvedValue({ success: true, reactionUri: 'at://...' });

    const postUri = 'at://did:plc:test/app.bsky.feed.post/123';

    // Pre-populate cache
    queryClient.setQueryData(['reactions', postUri], { reactions: [] });

    renderWithQuery(<ReactionPicker postUri={postUri} />);

    // Click emoji
    const thumbsUpButton = screen.getByTitle('Thumbs Up');
    fireEvent.click(thumbsUpButton);

    // Wait for mutation and cache invalidation
    await waitFor(() => {
      // Query should be invalidated (marked as stale)
      const queryState = queryClient.getQueryState(['reactions', postUri]);
      expect(queryState?.isInvalidated).toBe(true);
    });
  });
});
