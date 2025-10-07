import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ModerationLog } from '@/components/moderation/ModerationLog';
import type { ModerationAction } from '@/types';

const mockActions: ModerationAction[] = [
  {
    id: 1,
    action: 'hide_post',
    targetUri: 'at://did:plc:user/app.bsky.feed.post/abc',
    feedId: 'feed-1',
    communityId: null,
    moderatorDid: 'did:plc:moderator',
    reason: 'Spam content',
    performedAt: Date.now() / 1000 - 3600,
  },
  {
    id: 2,
    action: 'block_user',
    targetUri: 'did:plc:baduser',
    feedId: null,
    communityId: 'comm-1',
    moderatorDid: 'did:plc:moderator',
    reason: null,
    performedAt: Date.now() / 1000 - 7200,
  },
];

describe('ModerationLog Component', () => {
  it('renders table with columns (Action, Target, Moderator, Reason, Time)', () => {
    render(<ModerationLog actions={mockActions} loading={false} />);

    expect(screen.getByRole('columnheader', { name: /action/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /target/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /moderator/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /reason/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /time/i })).toBeInTheDocument();
  });

  it('sorts actions by performedAt DESC', () => {
    render(<ModerationLog actions={mockActions} loading={false} />);

    const rows = screen.getAllByRole('row');
    // First row (header) + most recent action first
    expect(rows[1]).toHaveTextContent('Hide Post');
    expect(rows[2]).toHaveTextContent('Block User');
  });

  it('shows empty state when actions array is empty', () => {
    render(<ModerationLog actions={[]} loading={false} />);

    expect(screen.getByText(/no.*actions|empty/i)).toBeInTheDocument();
  });

  it('shows loading spinner when loading=true', () => {
    render(<ModerationLog actions={[]} loading={true} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
