// EmojiPicker Component Tests (T030)
// Feature: 016-slack-mastodon-misskey

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmojiPicker } from '../../../src/components/reactions/EmojiPicker';
import * as api from '../../../src/lib/api';

// Mock API module
vi.mock('../../../src/lib/api', () => ({
  addReaction: vi.fn(),
  listEmojis: vi.fn(),
}));

describe('EmojiPicker', () => {
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

  const mockCustomEmojis = [
    {
      shortcode: 'partyblob',
      imageUrl: 'https://example.com/partyblob.gif',
      creator: 'did:plc:user1',
      animated: true,
      dimensions: { width: 64, height: 64 },
    },
    {
      shortcode: 'coolcat',
      imageUrl: 'https://example.com/coolcat.png',
      creator: 'did:plc:user2',
      animated: false,
      dimensions: { width: 64, height: 64 },
    },
  ];

  it('renders with Unicode tab active by default', async () => {
    vi.mocked(api.listEmojis).mockResolvedValue({ emojis: [] });

    renderWithQuery(
      <EmojiPicker
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Check tabs
    expect(screen.getByRole('tab', { name: /Unicode Emojis/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: /Custom Emojis/i })).toHaveAttribute(
      'aria-selected',
      'false'
    );

    // Check Unicode emoji categories
    await waitFor(() => {
      expect(screen.getByText('Smileys & Emotion')).toBeInTheDocument();
      expect(screen.getByText('Gestures & Hands')).toBeInTheDocument();
    });
  });

  it('switches to Custom tab when clicked', async () => {
    vi.mocked(api.listEmojis).mockResolvedValue({ emojis: mockCustomEmojis });

    renderWithQuery(
      <EmojiPicker
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Click Custom tab
    const customTab = screen.getByRole('tab', { name: /Custom Emojis/i });
    fireEvent.click(customTab);

    // Verify tab is active
    expect(customTab).toHaveAttribute('aria-selected', 'true');

    // Check custom emojis loaded
    await waitFor(() => {
      expect(screen.getByText(':partyblob:')).toBeInTheDocument();
      expect(screen.getByText(':coolcat:')).toBeInTheDocument();
    });
  });

  it('filters emojis by search query', async () => {
    vi.mocked(api.listEmojis).mockResolvedValue({ emojis: [] });

    renderWithQuery(
      <EmojiPicker
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Wait for emojis to load
    await waitFor(() => {
      expect(screen.getByTitle('Thumbs Up')).toBeInTheDocument();
    });

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/Search emojis/i);
    fireEvent.change(searchInput, { target: { value: 'heart' } });

    // Verify filtered results
    await waitFor(() => {
      // Should show heart emojis
      expect(screen.getByText('Hearts & Love')).toBeInTheDocument();
      // Should hide categories without "heart" in name/label
      expect(screen.queryByText('Gestures & Hands')).not.toBeInTheDocument();
    });
  });

  it('calls addReaction when Unicode emoji is clicked', async () => {
    vi.mocked(api.listEmojis).mockResolvedValue({ emojis: [] });
    vi.mocked(api.addReaction).mockResolvedValue({ success: true });

    const postUri = 'at://did:plc:test/app.bsky.feed.post/123';
    renderWithQuery(<EmojiPicker postUri={postUri} communityId="test-community" />);

    // Wait for emojis to load
    await waitFor(() => {
      expect(screen.getByTitle('Thumbs Up')).toBeInTheDocument();
    });

    // Click thumbs up emoji
    const thumbsUpButton = screen.getByTitle('Thumbs Up');
    fireEvent.click(thumbsUpButton);

    // Verify API call
    await waitFor(() => {
      expect(api.addReaction).toHaveBeenCalledWith(postUri, {
        type: 'unicode',
        value: 'U+1F44D',
      });
    });
  });

  it('calls addReaction when custom emoji is clicked', async () => {
    vi.mocked(api.listEmojis).mockResolvedValue({ emojis: mockCustomEmojis });
    vi.mocked(api.addReaction).mockResolvedValue({ success: true });

    const postUri = 'at://did:plc:test/app.bsky.feed.post/123';
    renderWithQuery(<EmojiPicker postUri={postUri} communityId="test-community" />);

    // Switch to Custom tab
    const customTab = screen.getByRole('tab', { name: /Custom Emojis/i });
    fireEvent.click(customTab);

    // Wait for custom emojis to load
    await waitFor(() => {
      expect(screen.getByText(':partyblob:')).toBeInTheDocument();
    });

    // Click custom emoji
    const partyblobButton = screen.getByText(':partyblob:').closest('button');
    if (partyblobButton) {
      fireEvent.click(partyblobButton);

      // Verify API call
      await waitFor(() => {
        expect(api.addReaction).toHaveBeenCalledWith(postUri, {
          type: 'custom',
          value: 'partyblob',
        });
      });
    }
  });

  it('shows loading state for custom emojis', async () => {
    vi.mocked(api.listEmojis).mockImplementation(
      // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentional never-resolving promise for loading state test
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQuery(
      <EmojiPicker
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Switch to Custom tab
    const customTab = screen.getByRole('tab', { name: /Custom Emojis/i });
    fireEvent.click(customTab);

    // Check loading indicator
    expect(screen.getByText(/Loading custom emojis/i)).toBeInTheDocument();
  });

  it('shows empty state when no custom emojis exist', async () => {
    vi.mocked(api.listEmojis).mockResolvedValue({ emojis: [] });

    renderWithQuery(
      <EmojiPicker
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Switch to Custom tab
    const customTab = screen.getByRole('tab', { name: /Custom Emojis/i });
    fireEvent.click(customTab);

    // Check empty state message
    await waitFor(() => {
      expect(screen.getByText(/No custom emojis/i)).toBeInTheDocument();
    });
  });

  it('closes picker after successful emoji selection', async () => {
    vi.mocked(api.listEmojis).mockResolvedValue({ emojis: [] });
    vi.mocked(api.addReaction).mockResolvedValue({ success: true });

    const onClose = vi.fn();
    renderWithQuery(
      <EmojiPicker
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
        onClose={onClose}
      />
    );

    // Wait for emojis to load
    await waitFor(() => {
      expect(screen.getByTitle('Thumbs Up')).toBeInTheDocument();
    });

    // Click emoji
    const thumbsUpButton = screen.getByTitle('Thumbs Up');
    fireEvent.click(thumbsUpButton);

    // Verify onClose called
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders all 6 Unicode emoji categories', async () => {
    vi.mocked(api.listEmojis).mockResolvedValue({ emojis: [] });

    renderWithQuery(
      <EmojiPicker
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Wait for emojis to load
    await waitFor(() => {
      expect(screen.getByText('Smileys & Emotion')).toBeInTheDocument();
      expect(screen.getByText('Gestures & Hands')).toBeInTheDocument();
      expect(screen.getByText('Hearts & Love')).toBeInTheDocument();
      expect(screen.getByText('Animals & Nature')).toBeInTheDocument();
      expect(screen.getByText('Food & Drink')).toBeInTheDocument();
      expect(screen.getByText('Activities')).toBeInTheDocument();
    });
  });

  it('clears search query when switching tabs', async () => {
    vi.mocked(api.listEmojis).mockResolvedValue({ emojis: mockCustomEmojis });

    renderWithQuery(
      <EmojiPicker
        postUri="at://did:plc:test/app.bsky.feed.post/123"
        communityId="test-community"
      />
    );

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/Search emojis/i);
    fireEvent.change(searchInput, { target: { value: 'heart' } });

    // Switch to Custom tab
    const customTab = screen.getByRole('tab', { name: /Custom Emojis/i });
    fireEvent.click(customTab);

    // Verify search query cleared
    expect(searchInput).toHaveValue('');
  });
});
