import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDSLoginForm } from '@/components/pds/PDSLoginForm';

describe('PDSLoginForm Component', () => {
  const pdsUrl = 'http://localhost:3000';

  it('validates handle field (required, format: handle.domain)', async () => {
    const user = userEvent.setup();

    render(<PDSLoginForm pdsUrl={pdsUrl} onSuccess={vi.fn()} />);

    const submitButton = screen.getByRole('button', { name: /login|sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/handle.*required/i)).toBeInTheDocument();
    });
  });

  it('validates password field (required)', async () => {
    const user = userEvent.setup();

    render(<PDSLoginForm pdsUrl={pdsUrl} onSuccess={vi.fn()} />);

    const handleInput = screen.getByLabelText(/handle/i);
    await user.type(handleInput, 'alice.test');

    const submitButton = screen.getByRole('button', { name: /login|sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password.*required/i)).toBeInTheDocument();
    });
  });

  it('calls onSuccess with agent, DID, handle on successful login', async () => {
    const onSuccessMock = vi.fn();
    const user = userEvent.setup();

    const mockAgent = { session: { did: 'did:plc:test123', handle: 'alice.test' } };

    vi.mock('@/lib/pds', () => ({
      loginToPDS: vi.fn().mockResolvedValue(mockAgent),
    }));

    render(<PDSLoginForm pdsUrl={pdsUrl} onSuccess={onSuccessMock} />);

    const handleInput = screen.getByLabelText(/handle/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(handleInput, 'alice.test');
    await user.type(passwordInput, 'test123');

    const submitButton = screen.getByRole('button', { name: /login|sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: mockAgent,
          did: 'did:plc:test123',
          handle: 'alice.test',
        })
      );
    });
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();

    vi.mock('@/lib/pds', () => ({
      loginToPDS: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
    }));

    render(<PDSLoginForm pdsUrl={pdsUrl} onSuccess={vi.fn()} />);

    const handleInput = screen.getByLabelText(/handle/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(handleInput, 'alice.test');
    await user.type(passwordInput, 'wrongpassword');

    const submitButton = screen.getByRole('button', { name: /login|sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error|failed|invalid/i)).toBeInTheDocument();
    });
  });

  it('displays PDS URL (read-only)', () => {
    render(<PDSLoginForm pdsUrl={pdsUrl} onSuccess={vi.fn()} />);

    expect(screen.getByText(pdsUrl)).toBeInTheDocument();
  });
});
