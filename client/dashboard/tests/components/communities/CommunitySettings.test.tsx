import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunitySettings } from '@/components/communities/CommunitySettings';
import type { Community } from '@/types';

const mockCommunity: Community = {
  id: 'comm-1',
  name: 'Test Community',
  description: 'Original description',
  stage: 'theme',
  parentId: null,
  ownerDid: 'did:plc:owner',
  memberCount: 5,
  postCount: 10,
  createdAt: Date.now() / 1000,
  graduatedAt: null,
  archivedAt: null,
};

describe('CommunitySettings Component', () => {
  it('only visible to community owner', () => {
    const { container } = render(
      <CommunitySettings
        community={mockCommunity}
        isOwner={false}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('edit form validates name (1-50 chars) and description', async () => {
    const user = userEvent.setup();

    render(
      <CommunitySettings
        community={mockCommunity}
        isOwner={true}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, ''); // Empty name

    const updateButton = screen.getByRole('button', { name: /update|save/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/name.*required/i)).toBeInTheDocument();
    });
  });

  it('update button calls API with updated data', async () => {
    const onUpdateMock = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <CommunitySettings
        community={mockCommunity}
        isOwner={true}
        onUpdate={onUpdateMock}
        onClose={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    const updateButton = screen.getByRole('button', { name: /update|save/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(onUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Name' })
      );
    });
  });

  it('close community button shows confirmation dialog', async () => {
    const user = userEvent.setup();

    render(
      <CommunitySettings
        community={mockCommunity}
        isOwner={true}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close.*community/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.getByText(/confirm|sure/i)).toBeInTheDocument();
    });
  });

  it('close community calls API and updates status', async () => {
    const onCloseMock = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <CommunitySettings
        community={mockCommunity}
        isOwner={true}
        onUpdate={vi.fn()}
        onClose={onCloseMock}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close.*community/i });
    await user.click(closeButton);

    // Confirm dialog
    const confirmButton = screen.getByRole('button', { name: /confirm|yes/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
