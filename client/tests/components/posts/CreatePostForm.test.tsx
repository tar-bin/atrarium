import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreatePostForm } from '@/components/posts/CreatePostForm';

describe('CreatePostForm Component', () => {
  const mockAgent = {} as any;
  const feedHashtag = '#atr_abc12345';

  it('validates text field (max 300 characters including hashtag)', async () => {
    const user = userEvent.setup();

    render(<CreatePostForm agent={mockAgent} feedHashtag={feedHashtag} onSuccess={vi.fn()} />);

    const textInput = screen.getByRole('textbox');
    await user.type(textInput, 'A'.repeat(301 - feedHashtag.length + 1)); // Exceed limit

    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/300.*characters/i)).toBeInTheDocument();
    });
  });

  it('shows character counter', () => {
    render(<CreatePostForm agent={mockAgent} feedHashtag={feedHashtag} onSuccess={vi.fn()} />);

    expect(screen.getByText(/0.*\/.*300/)).toBeInTheDocument();
  });

  it('previews final text with appended hashtag', async () => {
    const user = userEvent.setup();

    render(<CreatePostForm agent={mockAgent} feedHashtag={feedHashtag} onSuccess={vi.fn()} />);

    const textInput = screen.getByRole('textbox');
    await user.type(textInput, 'Hello world');

    expect(screen.getByText(`Hello world ${feedHashtag}`)).toBeInTheDocument();
  });

  it('calls onSuccess with post URI on successful submission', async () => {
    const onSuccessMock = vi.fn();
    const user = userEvent.setup();

    // Mock postToPDS to return URI
    vi.mock('@/lib/pds', () => ({
      postToPDS: vi.fn().mockResolvedValue('at://did:plc:user/app.bsky.feed.post/xyz'),
    }));

    render(
      <CreatePostForm agent={mockAgent} feedHashtag={feedHashtag} onSuccess={onSuccessMock} />
    );

    const textInput = screen.getByRole('textbox');
    await user.type(textInput, 'Test post');

    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalledWith('at://did:plc:user/app.bsky.feed.post/xyz');
    });
  });

  it('shows error message on failure', async () => {
    const user = userEvent.setup();

    vi.mock('@/lib/pds', () => ({
      postToPDS: vi.fn().mockRejectedValue(new Error('Network error')),
    }));

    render(<CreatePostForm agent={mockAgent} feedHashtag={feedHashtag} onSuccess={vi.fn()} />);

    const textInput = screen.getByRole('textbox');
    await user.type(textInput, 'Test');

    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it('clears form after successful submission', async () => {
    const user = userEvent.setup();

    vi.mock('@/lib/pds', () => ({
      postToPDS: vi.fn().mockResolvedValue('at://did:plc:user/app.bsky.feed.post/xyz'),
    }));

    render(<CreatePostForm agent={mockAgent} feedHashtag={feedHashtag} onSuccess={vi.fn()} />);

    const textInput = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.type(textInput, 'Test post');

    const submitButton = screen.getByRole('button', { name: /post|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(textInput.value).toBe('');
    });
  });
});
