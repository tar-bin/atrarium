import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateCommunityModal } from '@/components/communities/CreateCommunityModal';

describe('CreateCommunityModal Component', () => {
  it('validates name field (1-50 characters required)', async () => {
    const user = userEvent.setup();

    render(<CreateCommunityModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);

    const submitButton = screen.getByRole('button', { name: /submit|create/i });
    await user.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/name.*required/i)).toBeInTheDocument();
    });
  });

  it('validates description field (optional, max 500 chars)', async () => {
    const user = userEvent.setup();

    render(<CreateCommunityModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);

    const nameInput = screen.getByLabelText(/name/i);
    const descInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, 'Test Community');
    await user.type(descInput, 'A'.repeat(501)); // Exceed limit

    const submitButton = screen.getByRole('button', { name: /submit|create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/description.*500/i)).toBeInTheDocument();
    });
  });

  it('calls onSubmit with form data', async () => {
    const onSubmitMock = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CreateCommunityModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmitMock} />);

    const nameInput = screen.getByLabelText(/name/i);
    const descInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, 'New Community');
    await user.type(descInput, 'Community description');

    const submitButton = screen.getByRole('button', { name: /submit|create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith({
        name: 'New Community',
        description: 'Community description',
      });
    });
  });

  it('shows error message when submission fails', async () => {
    const onSubmitMock = vi.fn().mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();

    render(<CreateCommunityModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmitMock} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test');

    const submitButton = screen.getByRole('button', { name: /submit|create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it('closes modal on successful submission', async () => {
    const onCloseMock = vi.fn();
    const onSubmitMock = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<CreateCommunityModal isOpen={true} onClose={onCloseMock} onSubmit={onSubmitMock} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test Community');

    const submitButton = screen.getByRole('button', { name: /submit|create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
