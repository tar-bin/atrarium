import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommunityList } from '@/components/communities/CommunityList';
import type { Community } from '@/types';

const mockCommunities: Community[] = [
  {
    id: 'comm-1',
    name: 'Test Community',
    description: 'Description',
    stage: 'theme',
    parentId: null,
    ownerDid: 'did:plc:owner',
    memberCount: 5,
    postCount: 10,
    createdAt: Date.now() / 1000,
    graduatedAt: null,
    archivedAt: null,
  },
];

describe('CommunityList Component', () => {
  it('renders CommunityCard for each community', () => {
    render(
      <CommunityList
        communities={mockCommunities}
        loading={false}
        error={null}
        onCreateClick={vi.fn()}
      />
    );

    expect(screen.getByText('Test Community')).toBeInTheDocument();
  });

  it('shows loading spinner when loading=true', () => {
    render(<CommunityList communities={[]} loading={true} error={null} onCreateClick={vi.fn()} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    render(
      <CommunityList
        communities={[]}
        loading={false}
        error="Failed to load communities"
        onCreateClick={vi.fn()}
      />
    );

    expect(screen.getByText(/failed to load communities/i)).toBeInTheDocument();
  });

  it('"Create Community" button calls onCreateClick', async () => {
    const onCreateClickMock = vi.fn();
    const user = userEvent.setup();

    render(
      <CommunityList
        communities={mockCommunities}
        loading={false}
        error={null}
        onCreateClick={onCreateClickMock}
      />
    );

    const createButton = screen.getByRole('button', { name: /create community/i });
    await user.click(createButton);

    expect(onCreateClickMock).toHaveBeenCalledOnce();
  });
});
