import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommunityCard } from '@/components/communities/CommunityCard';
import type { Community } from '@/types';

const mockCommunity: Community = {
  id: 'comm-1',
  name: 'Tech Community',
  description: 'A tech community',
  stage: 'theme',
  parentId: null,
  ownerDid: 'did:plc:owner',
  memberCount: 15,
  postCount: 42,
  createdAt: Date.now() / 1000,
  graduatedAt: null,
  archivedAt: null,
};

describe('CommunityCard Component', () => {
  it('displays community name, member count, and post count', () => {
    render(<CommunityCard community={mockCommunity} onClick={vi.fn()} />);

    expect(screen.getByText('Tech Community')).toBeInTheDocument();
    expect(screen.getByText(/15.*members/i)).toBeInTheDocument();
    expect(screen.getByText(/42.*posts/i)).toBeInTheDocument();
  });

  it('onClick callback triggers when card clicked', async () => {
    const onClickMock = vi.fn();
    const user = userEvent.setup();

    render(<CommunityCard community={mockCommunity} onClick={onClickMock} />);

    const card = screen.getByRole('button');
    await user.click(card);

    expect(onClickMock).toHaveBeenCalledOnce();
  });

  it('shows stage badge (Theme)', () => {
    render(<CommunityCard community={mockCommunity} onClick={vi.fn()} />);

    expect(screen.getByText(/theme/i)).toBeInTheDocument();
  });
});
