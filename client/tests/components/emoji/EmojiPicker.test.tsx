import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmojiPicker } from '@/components/emoji/EmojiPicker';

// Mock apiClient
vi.mock('@/lib/api', () => ({
  apiClient: {
    emoji: {
      registry: vi.fn(),
    },
  },
}));

const mockEmojiRegistry = {
  wave: {
    emojiURI: 'at://did:plc:user123/net.atrarium.emoji.custom/abc',
    blobURI: 'https://cdn.example.com/emoji/wave.png',
    animated: false,
  },
  happy_face: {
    emojiURI: 'at://did:plc:user456/net.atrarium.emoji.custom/def',
    blobURI: 'https://cdn.example.com/emoji/happy.gif',
    animated: true,
  },
  rocket: {
    emojiURI: 'at://did:plc:user789/net.atrarium.emoji.custom/ghi',
    blobURI: 'https://cdn.example.com/emoji/rocket.png',
    animated: false,
  },
};

describe('EmojiPicker Component', () => {
  it('renders trigger button by default', () => {
    render(<EmojiPicker communityId="abc12345" onEmojiSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /emoji/i })).toBeInTheDocument();
  });

  it('renders custom trigger when provided', () => {
    render(
      <EmojiPicker
        communityId="abc12345"
        onEmojiSelect={vi.fn()}
        trigger={<button>Custom Trigger</button>}
      />
    );

    expect(screen.getByRole('button', { name: /custom trigger/i })).toBeInTheDocument();
  });

  it('fetches emoji registry when popover opens', async () => {
    const user = userEvent.setup();
    const mockRegistry = vi.fn().mockResolvedValue({ emoji: mockEmojiRegistry });

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.registry = mockRegistry;

    render(<EmojiPicker communityId="abc12345" onEmojiSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /emoji/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(mockRegistry).toHaveBeenCalledWith({
        communityId: 'abc12345',
      });
    });
  });

  it('displays all emoji from registry', async () => {
    const user = userEvent.setup();
    const mockRegistry = vi.fn().mockResolvedValue({ emoji: mockEmojiRegistry });

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.registry = mockRegistry;

    render(<EmojiPicker communityId="abc12345" onEmojiSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /emoji/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByAltText('wave')).toBeInTheDocument();
      expect(screen.getByAltText('happy_face')).toBeInTheDocument();
      expect(screen.getByAltText('rocket')).toBeInTheDocument();
    });
  });

  it('calls onEmojiSelect when emoji is clicked', async () => {
    const user = userEvent.setup();
    const onEmojiSelect = vi.fn();
    const mockRegistry = vi.fn().mockResolvedValue({ emoji: mockEmojiRegistry });

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.registry = mockRegistry;

    render(<EmojiPicker communityId="abc12345" onEmojiSelect={onEmojiSelect} />);

    const trigger = screen.getByRole('button', { name: /emoji/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByAltText('wave')).toBeInTheDocument();
    });

    const waveEmoji = screen.getByAltText('wave').closest('button');
    expect(waveEmoji).toBeInTheDocument();

    if (waveEmoji) {
      await user.click(waveEmoji);
    }

    await waitFor(() => {
      expect(onEmojiSelect).toHaveBeenCalledWith('wave');
    });
  });

  it('closes popover after emoji selection', async () => {
    const user = userEvent.setup();
    const onEmojiSelect = vi.fn();
    const mockRegistry = vi.fn().mockResolvedValue({ emoji: mockEmojiRegistry });

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.registry = mockRegistry;

    render(<EmojiPicker communityId="abc12345" onEmojiSelect={onEmojiSelect} />);

    const trigger = screen.getByRole('button', { name: /emoji/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByAltText('wave')).toBeInTheDocument();
    });

    const waveEmoji = screen.getByAltText('wave').closest('button');
    if (waveEmoji) {
      await user.click(waveEmoji);
    }

    await waitFor(() => {
      // Popover should be closed - emoji images no longer visible
      expect(screen.queryByAltText('wave')).not.toBeInTheDocument();
    });
  });

  it('shows loading state while fetching emoji', async () => {
    const user = userEvent.setup();
    const mockRegistry = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          // Intentionally never resolves to test loading state
        })
    );

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.registry = mockRegistry;

    render(<EmojiPicker communityId="abc12345" onEmojiSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /emoji/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/loading emoji/i)).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    const user = userEvent.setup();
    const mockRegistry = vi.fn().mockRejectedValue(new Error('Failed to load'));

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.registry = mockRegistry;

    render(<EmojiPicker communityId="abc12345" onEmojiSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /emoji/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('shows "no custom emoji" message when registry is empty', async () => {
    const user = userEvent.setup();
    const mockRegistry = vi.fn().mockResolvedValue({ emoji: {} });

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.registry = mockRegistry;

    render(<EmojiPicker communityId="abc12345" onEmojiSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /emoji/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/no custom emoji available/i)).toBeInTheDocument();
    });
  });

  it('shows emoji shortcode tooltip on hover', async () => {
    const user = userEvent.setup();
    const mockRegistry = vi.fn().mockResolvedValue({ emoji: mockEmojiRegistry });

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.registry = mockRegistry;

    render(<EmojiPicker communityId="abc12345" onEmojiSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /emoji/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByAltText('wave')).toBeInTheDocument();
    });

    const waveEmoji = screen.getByAltText('wave').closest('button');
    expect(waveEmoji).toHaveAttribute('title', ':wave:');
  });
});
