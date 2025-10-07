import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateFeedModal } from '@/components/feeds/CreateFeedModal';

describe('CreateFeedModal Component', () => {
  it('validates name field (1-50 characters required)', async () => {
    const user = userEvent.setup();

    render(<CreateFeedModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);

    const submitButton = screen.getByRole('button', { name: /submit|create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name.*required/i)).toBeInTheDocument();
    });
  });

  it('calls onSubmit with form data', async () => {
    const onSubmitMock = vi.fn().mockResolvedValue({ id: 'feed-1', hashtag: '#atr_xyz12345' });
    const user = userEvent.setup();

    render(<CreateFeedModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmitMock} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'New Feed');

    const submitButton = screen.getByRole('button', { name: /submit|create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Feed' }));
    });
  });

  it('shows generated hashtag with copy button on success', async () => {
    const onSubmitMock = vi.fn().mockResolvedValue({ id: 'feed-1', hashtag: '#atr_xyz12345' });
    const user = userEvent.setup();

    render(<CreateFeedModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmitMock} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'New Feed');

    const submitButton = screen.getByRole('button', { name: /submit|create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('#atr_xyz12345')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });
  });

  it('"Done" button closes modal', async () => {
    const onCloseMock = vi.fn();
    const onSubmitMock = vi.fn().mockResolvedValue({ id: 'feed-1', hashtag: '#atr_xyz12345' });
    const user = userEvent.setup();

    render(<CreateFeedModal isOpen={true} onClose={onCloseMock} onSubmit={onSubmitMock} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'New Feed');

    const submitButton = screen.getByRole('button', { name: /submit|create/i });
    await user.click(submitButton);

    await waitFor(async () => {
      const doneButton = screen.getByRole('button', { name: /done/i });
      await user.click(doneButton);
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
