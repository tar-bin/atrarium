// Component Test: StageUpgradeButton
// Tests stage upgrade button behavior and Dunbar threshold display

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StageUpgradeButton } from '@/components/communities/StageUpgradeButton';
import type { Community } from '@/types';

// Mock group data
const mockThemeGroup: Community = {
  id: 'theme1',
  name: 'UI Patterns',
  stage: 'theme' as const,
  memberCount: 15, // Eligible for Community upgrade
  createdAt: Date.now() / 1000,
};

const mockCommunityGroup: Community = {
  id: 'community1',
  name: 'Design Community',
  stage: 'community' as const,
  memberCount: 50, // Eligible for Graduated upgrade
  createdAt: Date.now() / 1000,
};

const mockThemeGroupBelowThreshold: Community = {
  id: 'theme2',
  name: 'Small Theme',
  stage: 'theme' as const,
  memberCount: 10, // Below Community threshold (15)
  createdAt: Date.now() / 1000,
};

const mockGraduatedGroup: Community = {
  id: 'graduated1',
  name: 'Graduated Community',
  stage: 'graduated' as const,
  memberCount: 75, // Already graduated
  createdAt: Date.now() / 1000,
};

// Mock API client
const mockUpgradeStage = vi.fn();
vi.mock('@/lib/api', () => ({
  apiClient: {
    communities: {
      upgradeStage: (...args: unknown[]) => mockUpgradeStage(...args),
    },
  },
}));

// Mock toast notifications
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('StageUpgradeButton Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  it('shows upgrade button when Theme group meets Community threshold (>= 15)', () => {
    renderWithProviders(<StageUpgradeButton group={mockThemeGroup} />);

    const upgradeButton = screen.getByRole('button', { name: /upgrade to community/i });
    expect(upgradeButton).toBeInTheDocument();
    expect(upgradeButton).toBeEnabled();
  });

  it('shows upgrade button when Community group meets Graduated threshold (>= 50)', () => {
    renderWithProviders(<StageUpgradeButton group={mockCommunityGroup} />);

    const upgradeButton = screen.getByRole('button', { name: /upgrade to graduated/i });
    expect(upgradeButton).toBeInTheDocument();
    expect(upgradeButton).toBeEnabled();
  });

  it('hides upgrade button when memberCount below threshold', () => {
    renderWithProviders(<StageUpgradeButton group={mockThemeGroupBelowThreshold} />);

    // Upgrade button should not be visible
    const upgradeButton = screen.queryByRole('button', { name: /upgrade/i });
    expect(upgradeButton).not.toBeInTheDocument();
  });

  it('hides upgrade button for Graduated groups (already at max stage)', () => {
    renderWithProviders(<StageUpgradeButton group={mockGraduatedGroup} />);

    // No upgrade button for Graduated stage
    const upgradeButton = screen.queryByRole('button', { name: /upgrade/i });
    expect(upgradeButton).not.toBeInTheDocument();
  });

  it('displays Dunbar threshold indicator (15 for Community, 50 for Graduated)', () => {
    renderWithProviders(<StageUpgradeButton group={mockThemeGroup} />);

    // Should show member count and threshold
    expect(screen.getByText(/15.*15/i)).toBeInTheDocument(); // e.g., "15 / 15 members"
  });

  it('opens confirmation modal when upgrade button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StageUpgradeButton group={mockThemeGroup} />);

    const upgradeButton = screen.getByRole('button', { name: /upgrade to community/i });
    await user.click(upgradeButton);

    // Verify modal opens with confirmation text
    expect(await screen.findByText(/upgrade.*UI Patterns.*to.*community/i)).toBeInTheDocument();
  });

  it('calls upgradeStage API when upgrade confirmed', async () => {
    const user = userEvent.setup();
    mockUpgradeStage.mockResolvedValueOnce({
      id: 'theme1',
      stage: 'community',
      memberCount: 15,
    });

    renderWithProviders(<StageUpgradeButton group={mockThemeGroup} />);

    // Click upgrade button
    const upgradeButton = screen.getByRole('button', { name: /upgrade to community/i });
    await user.click(upgradeButton);

    // Confirm in modal
    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    // Verify API called with correct parameters
    await waitFor(() => {
      expect(mockUpgradeStage).toHaveBeenCalledWith({
        groupId: 'theme1',
        targetStage: 'community',
      });
    });
  });

  it('closes modal when cancel button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StageUpgradeButton group={mockThemeGroup} />);

    // Open modal
    const upgradeButton = screen.getByRole('button', { name: /upgrade to community/i });
    await user.click(upgradeButton);

    // Cancel
    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText(/upgrade.*UI Patterns/i)).not.toBeInTheDocument();
    });
  });

  it('shows success toast on successful upgrade', async () => {
    const user = userEvent.setup();
    const mockToast = vi.fn();
    mockUpgradeStage.mockResolvedValueOnce({
      id: 'theme1',
      stage: 'community',
    });

    vi.mocked(await import('@/components/ui/use-toast')).useToast = () => ({
      toast: mockToast,
    });

    renderWithProviders(<StageUpgradeButton group={mockThemeGroup} />);

    // Click upgrade and confirm
    const upgradeButton = screen.getByRole('button', { name: /upgrade to community/i });
    await user.click(upgradeButton);

    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    // Verify success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('success'),
        })
      );
    });
  });

  it('displays error message when upgrade fails', async () => {
    const user = userEvent.setup();
    const mockToast = vi.fn();
    mockUpgradeStage.mockRejectedValueOnce(new Error('Threshold not met'));

    vi.mocked(await import('@/components/ui/use-toast')).useToast = () => ({
      toast: mockToast,
    });

    renderWithProviders(<StageUpgradeButton group={mockThemeGroup} />);

    // Click upgrade and confirm
    const upgradeButton = screen.getByRole('button', { name: /upgrade to community/i });
    await user.click(upgradeButton);

    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    // Verify error toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('error'),
        })
      );
    });
  });

  it('invalidates group query cache on successful upgrade', async () => {
    const user = userEvent.setup();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mockUpgradeStage.mockResolvedValueOnce({
      id: 'theme1',
      stage: 'community',
    });

    renderWithProviders(<StageUpgradeButton group={mockThemeGroup} />);

    // Click upgrade and confirm
    const upgradeButton = screen.getByRole('button', { name: /upgrade to community/i });
    await user.click(upgradeButton);

    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    // Verify query invalidation
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['group', 'theme1'],
        })
      );
    });
  });

  it('shows loading state during upgrade', async () => {
    const user = userEvent.setup();
    mockUpgradeStage.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

    renderWithProviders(<StageUpgradeButton group={mockThemeGroup} />);

    // Click upgrade and confirm
    const upgradeButton = screen.getByRole('button', { name: /upgrade to community/i });
    await user.click(upgradeButton);

    const confirmButton = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    // Verify loading indicator
    expect(await screen.findByText(/upgrading/i)).toBeInTheDocument();
  });

  it('calculates correct target stage based on current stage', () => {
    // Theme → Community
    const { rerender } = renderWithProviders(<StageUpgradeButton group={mockThemeGroup} />);
    expect(screen.getByRole('button', { name: /upgrade to community/i })).toBeInTheDocument();

    // Community → Graduated
    rerender(
      <QueryClientProvider client={queryClient}>
        <StageUpgradeButton group={mockCommunityGroup} />
      </QueryClientProvider>
    );
    expect(screen.getByRole('button', { name: /upgrade to graduated/i })).toBeInTheDocument();
  });
});
