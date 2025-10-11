// Component Test: GroupHierarchy
// Tests hierarchical group tree view rendering and navigation

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupHierarchy } from '@/components/communities/GroupHierarchy';

// Mock API responses
const _mockParentGroup = {
  id: 'parent123',
  name: 'Design Patterns',
  description: 'Software design patterns community',
  stage: 'graduated' as const,
  hashtag: '#atrarium_parent01',
  memberCount: 50,
  createdAt: Date.now() / 1000,
};

const mockChildren = [
  {
    id: 'child1',
    name: 'UI Patterns',
    description: 'User interface patterns',
    stage: 'theme' as const,
    hashtag: '#atrarium_child01',
    parentGroup: `at://did:plc:alice/net.atrarium.group.config/parent123`,
    memberCount: 8,
    createdAt: Date.now() / 1000,
  },
  {
    id: 'child2',
    name: 'API Patterns',
    description: 'REST, GraphQL patterns',
    stage: 'theme' as const,
    hashtag: '#atrarium_child02',
    parentGroup: `at://did:plc:alice/net.atrarium.group.config/parent123`,
    memberCount: 5,
    createdAt: Date.now() / 1000,
  },
  {
    id: 'child3',
    name: 'Database Patterns',
    description: 'Data modeling patterns',
    stage: 'theme' as const,
    hashtag: '#atrarium_child03',
    parentGroup: `at://did:plc:alice/net.atrarium.group.config/parent123`,
    memberCount: 12,
    createdAt: Date.now() / 1000,
  },
];

// Mock API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    communities: {
      listChildren: vi.fn().mockResolvedValue({
        children: mockChildren,
        cursor: undefined,
      }),
    },
  },
}));

describe('GroupHierarchy Component', () => {
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

  const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter({
      routes: [
        {
          path: '/',
          element: component,
        },
      ],
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  };

  it('displays parent and children in tree view', async () => {
    renderWithRouter(<GroupHierarchy groupId="parent123" />);

    // Wait for data to load
    expect(await screen.findByText('Design Patterns')).toBeInTheDocument();

    // Verify all children are displayed
    expect(screen.getByText('UI Patterns')).toBeInTheDocument();
    expect(screen.getByText('API Patterns')).toBeInTheDocument();
    expect(screen.getByText('Database Patterns')).toBeInTheDocument();
  });

  it('shows stage badges for each group', async () => {
    renderWithRouter(<GroupHierarchy groupId="parent123" />);

    await screen.findByText('Design Patterns');

    // Verify stage badges
    expect(screen.getByText(/graduated/i)).toBeInTheDocument();

    // Theme badges for children (should appear 3 times)
    const themeBadges = screen.getAllByText(/theme/i);
    expect(themeBadges).toHaveLength(3);
  });

  it('shows member counts for each group', async () => {
    renderWithRouter(<GroupHierarchy groupId="parent123" />);

    await screen.findByText('Design Patterns');

    // Verify member counts
    expect(screen.getByText(/50.*members/i)).toBeInTheDocument();
    expect(screen.getByText(/8.*members/i)).toBeInTheDocument();
    expect(screen.getByText(/5.*members/i)).toBeInTheDocument();
    expect(screen.getByText(/12.*members/i)).toBeInTheDocument();
  });

  it('makes group names clickable for navigation', async () => {
    const user = userEvent.setup();
    renderWithRouter(<GroupHierarchy groupId="parent123" />);

    await screen.findByText('Design Patterns');

    // Click child group name
    const uiPatternsLink = screen.getByRole('link', { name: /UI Patterns/i });
    expect(uiPatternsLink).toBeInTheDocument();
    expect(uiPatternsLink).toHaveAttribute('href', '/communities/child1');

    // Verify navigation would work (href is correct)
    await user.click(uiPatternsLink);
    // Note: Actual navigation is handled by TanStack Router
  });

  it('handles 1-level depth constraint (no grandchildren)', async () => {
    renderWithRouter(<GroupHierarchy groupId="parent123" />);

    await screen.findByText('Design Patterns');

    // Verify only 1 level of hierarchy is displayed
    // Children of children should NOT be rendered
    const hierarchyItems = screen.getAllByRole('listitem');

    // Parent + 3 children = 4 items total
    expect(hierarchyItems.length).toBeLessThanOrEqual(4);
  });

  it('shows empty state when no children exist', async () => {
    // Mock empty children response
    const { apiClient } = await import('@/lib/api');
    vi.mocked(apiClient.communities.listChildren).mockResolvedValueOnce({
      children: [],
      cursor: undefined,
    });

    renderWithRouter(<GroupHierarchy groupId="parent123" />);

    // Wait for empty state message
    expect(await screen.findByText(/no child themes yet/i)).toBeInTheDocument();
  });

  it('handles loading state', () => {
    renderWithRouter(<GroupHierarchy groupId="parent123" />);

    // Verify loading indicator appears
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('handles error state', async () => {
    // Mock API error
    const { apiClient } = await import('@/lib/api');
    vi.mocked(apiClient.communities.listChildren).mockRejectedValueOnce(
      new Error('Failed to fetch children')
    );

    renderWithRouter(<GroupHierarchy groupId="parent123" />);

    // Wait for error message
    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });

  it('uses collapsible Radix UI Accordion for hierarchy', async () => {
    renderWithRouter(<GroupHierarchy groupId="parent123" />);

    await screen.findByText('Design Patterns');

    // Verify Accordion component is rendered
    const accordion = screen.getByRole('region');
    expect(accordion).toBeInTheDocument();
    expect(accordion).toHaveAttribute('data-radix-accordion');
  });

  it('shows correct hierarchy structure with parent at top', async () => {
    renderWithRouter(<GroupHierarchy groupId="parent123" />);

    await screen.findByText('Design Patterns');

    // Verify parent is displayed before children
    const parentElement = screen.getByText('Design Patterns');
    const child1Element = screen.getByText('UI Patterns');

    // Parent should appear before child in DOM order
    expect(parentElement.compareDocumentPosition(child1Element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });
});
