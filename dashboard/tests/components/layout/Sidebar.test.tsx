import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '@/components/layout/Sidebar';

describe('Sidebar Component', () => {
  it('highlights active menu item based on currentPath', () => {
    render(<Sidebar currentPath="/communities" isOpen={true} onClose={vi.fn()} />);

    const communityLink = screen.getByRole('link', { name: /communities/i });
    // Active link should have specific styling or aria-current attribute
    expect(communityLink).toHaveAttribute('aria-current', 'page');
  });

  it('displays all navigation links', () => {
    render(<Sidebar currentPath="/" isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /communities/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /moderation log/i })).toBeInTheDocument();
  });

  it('shows user info when authenticated', () => {
    // Mock user session context or pass as prop
    render(
      <Sidebar
        currentPath="/"
        isOpen={true}
        onClose={vi.fn()}
        user={{ handle: 'alice.test', did: 'did:plc:test123', isAuthenticated: true, agent: null }}
      />
    );

    expect(screen.getByText('alice.test')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked (mobile)', async () => {
    const onCloseMock = vi.fn();
    const user = userEvent.setup();

    render(<Sidebar currentPath="/" isOpen={true} onClose={onCloseMock} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledOnce();
  });
});
