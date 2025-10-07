import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModerationActions } from '@/components/moderation/ModerationActions';

describe('ModerationActions Component', () => {
  it('shows "Hide" button for posts with status=approved', () => {
    render(
      <ModerationActions
        targetType="post"
        currentStatus="approved"
        onHide={vi.fn()}
        onUnhide={vi.fn()}
        onBlockUser={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /hide/i })).toBeInTheDocument();
  });

  it('shows "Unhide" button for posts with status=hidden', () => {
    render(
      <ModerationActions
        targetType="post"
        currentStatus="hidden"
        onHide={vi.fn()}
        onUnhide={vi.fn()}
        onBlockUser={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /unhide/i })).toBeInTheDocument();
  });

  it('shows "Block User" button for targetType=user', () => {
    render(
      <ModerationActions
        targetType="user"
        currentStatus="approved"
        onHide={vi.fn()}
        onUnhide={vi.fn()}
        onBlockUser={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /block user/i })).toBeInTheDocument();
  });

  it('all buttons show confirmation dialog before action', async () => {
    const onHideMock = vi.fn();
    const user = userEvent.setup();

    render(
      <ModerationActions
        targetType="post"
        currentStatus="approved"
        onHide={onHideMock}
        onUnhide={vi.fn()}
        onBlockUser={vi.fn()}
      />
    );

    const hideButton = screen.getByRole('button', { name: /hide/i });
    await user.click(hideButton);

    // Confirmation dialog should appear
    expect(screen.getByText(/confirm|sure/i)).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /confirm|yes/i });
    await user.click(confirmButton);

    expect(onHideMock).toHaveBeenCalled();
  });
});
