import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmojiApprovalList } from '@/components/emoji/EmojiApprovalList';

// Mock apiClient
vi.mock('@/lib/api', () => ({
  apiClient: {
    emoji: {
      approve: vi.fn(),
    },
  },
}));

const mockSubmissions = [
  {
    emojiUri: 'at://did:plc:user123/net.atrarium.emoji.custom/abc',
    shortcode: 'wave',
    creator: 'did:plc:user123',
    creatorHandle: 'alice.bsky.social',
    uploadedAt: '2025-01-10T12:00:00Z',
    format: 'png' as const,
    animated: false,
    blobUrl: 'https://cdn.example.com/emoji/wave.png',
  },
  {
    emojiUri: 'at://did:plc:user456/net.atrarium.emoji.custom/def',
    shortcode: 'happy_face',
    creator: 'did:plc:user456',
    creatorHandle: 'bob.bsky.social',
    uploadedAt: '2025-01-10T13:00:00Z',
    format: 'gif' as const,
    animated: true,
    blobUrl: 'https://cdn.example.com/emoji/happy.gif',
  },
];

describe('EmojiApprovalList Component', () => {
  it('displays all submissions with correct metadata', () => {
    render(<EmojiApprovalList communityId="abc12345" submissions={mockSubmissions} />);

    expect(screen.getByText(':wave:')).toBeInTheDocument();
    expect(screen.getByText('@alice.bsky.social')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();

    expect(screen.getByText(':happy_face:')).toBeInTheDocument();
    expect(screen.getByText('@bob.bsky.social')).toBeInTheDocument();
    expect(screen.getByText('GIF')).toBeInTheDocument();
    expect(screen.getByText('• Animated')).toBeInTheDocument();
  });

  it('shows "no pending submissions" when list is empty', () => {
    render(<EmojiApprovalList communityId="abc12345" submissions={[]} />);

    expect(screen.getByText(/no pending emoji submissions/i)).toBeInTheDocument();
  });

  it('calls approve API when approve button clicked', async () => {
    const user = userEvent.setup();
    const onApprovalChange = vi.fn();
    const mockApprove = vi.fn().mockResolvedValue({
      approvalURI: 'at://did:plc:owner/net.atrarium.emoji.approval/xyz',
      status: 'approved',
    });

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.approve = mockApprove;

    render(
      <EmojiApprovalList
        communityId="abc12345"
        submissions={mockSubmissions}
        onApprovalChange={onApprovalChange}
      />
    );

    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith({
        communityId: 'abc12345',
        emojiURI: 'at://did:plc:user123/net.atrarium.emoji.custom/abc',
        approve: true,
      });
      expect(onApprovalChange).toHaveBeenCalled();
    });
  });

  it('calls approve API with reason when reject button clicked', async () => {
    const user = userEvent.setup();
    const onApprovalChange = vi.fn();
    const mockApprove = vi.fn().mockResolvedValue({
      approvalURI: 'at://did:plc:owner/net.atrarium.emoji.approval/xyz',
      status: 'rejected',
    });

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.approve = mockApprove;

    render(
      <EmojiApprovalList
        communityId="abc12345"
        submissions={mockSubmissions}
        onApprovalChange={onApprovalChange}
      />
    );

    // Type reject reason
    const reasonInputs = screen.getAllByPlaceholderText(/reason for rejection/i);
    await user.type(reasonInputs[0], 'Not appropriate for community');

    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    await user.click(rejectButtons[0]);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith({
        communityId: 'abc12345',
        emojiURI: 'at://did:plc:user123/net.atrarium.emoji.custom/abc',
        approve: false,
        reason: 'Not appropriate for community',
      });
      expect(onApprovalChange).toHaveBeenCalled();
    });
  });

  it('disables all buttons while processing a submission', async () => {
    const user = userEvent.setup();
    const mockApprove = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          // Intentionally never resolves to test loading state
        })
    );

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.approve = mockApprove;

    render(<EmojiApprovalList communityId="abc12345" submissions={mockSubmissions} />);

    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approving/i })).toBeDisabled();
      // All other buttons should also be disabled
      const allButtons = screen.getAllByRole('button');
      allButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  it('displays error message when API call fails', async () => {
    const user = userEvent.setup();
    const mockApprove = vi.fn().mockRejectedValue(new Error('Network error'));

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.approve = mockApprove;

    render(<EmojiApprovalList communityId="abc12345" submissions={mockSubmissions} />);

    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('clears reject reason after successful rejection', async () => {
    const user = userEvent.setup();
    const mockApprove = vi.fn().mockResolvedValue({
      approvalURI: 'at://did:plc:owner/net.atrarium.emoji.approval/xyz',
      status: 'rejected',
    });

    const { apiClient } = await import('@/lib/api');
    apiClient.emoji.approve = mockApprove;

    render(<EmojiApprovalList communityId="abc12345" submissions={mockSubmissions} />);

    const reasonInputs = screen.getAllByPlaceholderText(/reason for rejection/i);
    await user.type(reasonInputs[0], 'Not appropriate');

    const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
    await user.click(rejectButtons[0]);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalled();
      // Reason should be cleared
      expect((reasonInputs[0] as HTMLInputElement).value).toBe('');
    });
  });
});
