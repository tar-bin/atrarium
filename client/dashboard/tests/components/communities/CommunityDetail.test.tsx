import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityDetail } from '@/components/communities/CommunityDetail';
import type { Community, Feed } from '@/types';

const mockCommunity: Community = {
  id: 'comm-1',
  name: 'Test Community',
  description: 'Test Description',
  stage: 'theme',
  parentId: null,
  ownerDid: 'did:plc:owner',
  memberCount: 10,
  postCount: 20,
  createdAt: Date.now() / 1000,
  graduatedAt: null,
  archivedAt: null,
};

const mockFeeds: Feed[] = [
  {
    id: 'feed-1',
    communityId: 'comm-1',
    name: 'General',
    description: null,
    status: 'active',
    hashtag: '#atr_abc12345',
    posts7d: 5,
    activeUsers7d: 3,
    lastPostAt: Date.now() / 1000,
    createdAt: Date.now() / 1000,
  },
];

describe('CommunityDetail Component', () => {
  it('displays community info (name, description, stats)', () => {
    render(
      <CommunityDetail
        community={mockCommunity}
        feeds={mockFeeds}
        loading={false}
        error={null}
        onCreateFeedClick={vi.fn()}
      />
    );

    expect(screen.getByText('Test Community')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText(/10.*members/i)).toBeInTheDocument();
  });

  it('renders FeedList component with feeds prop', () => {
    render(
      <CommunityDetail
        community={mockCommunity}
        feeds={mockFeeds}
        loading={false}
        error={null}
        onCreateFeedClick={vi.fn()}
      />
    );

    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('"Create Feed" button calls onCreateFeedClick', async () => {
    const onCreateFeedClickMock = vi.fn();
    const user = userEvent.setup();

    render(
      <CommunityDetail
        community={mockCommunity}
        feeds={mockFeeds}
        loading={false}
        error={null}
        onCreateFeedClick={onCreateFeedClickMock}
      />
    );

    const createButton = screen.getByRole('button', { name: /create feed/i });
    await user.click(createButton);

    expect(onCreateFeedClickMock).toHaveBeenCalledOnce();
  });
});
