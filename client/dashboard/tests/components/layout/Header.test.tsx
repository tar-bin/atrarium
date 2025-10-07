import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '@/components/layout/Header';

describe('Header Component', () => {
  it('displays app title', () => {
    render(<Header user={null} onLogout={vi.fn()} />);

    expect(screen.getByText('Atrarium Dashboard')).toBeInTheDocument();
  });

  it('shows user handle when authenticated', () => {
    const mockUser = {
      handle: 'alice.test',
      did: 'did:plc:test123',
      isAuthenticated: true,
      agent: null,
    };

    render(<Header user={mockUser} onLogout={vi.fn()} />);

    expect(screen.getByText('alice.test')).toBeInTheDocument();
  });

  it('logout button calls onLogout callback', async () => {
    const onLogoutMock = vi.fn();
    const user = userEvent.setup();
    const mockUser = {
      handle: 'alice.test',
      did: 'did:plc:test123',
      isAuthenticated: true,
      agent: null,
    };

    render(<Header user={mockUser} onLogout={onLogoutMock} />);

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);

    expect(onLogoutMock).toHaveBeenCalledOnce();
  });

  it('does not show logout button when not authenticated', () => {
    render(<Header user={null} onLogout={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });
});
