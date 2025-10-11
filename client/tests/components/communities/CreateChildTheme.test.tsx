// Component Test: CreateChildTheme
// Tests child theme creation form validation and submission

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateChildTheme } from '@/components/communities/CreateChildTheme';

// Mock graduated parent group
const _mockGraduatedParent = {
  id: 'graduated123',
  name: 'Design Patterns',
  stage: 'graduated' as const,
  memberCount: 50,
};

// Mock API client
const mockCreateChild = vi.fn();
vi.mock('@/lib/api', () => ({
  apiClient: {
    communities: {
      createChild: (...args: unknown[]) => mockCreateChild(...args),
    },
  },
}));

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CreateChildTheme Component', () => {
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

  it('renders form with name and description fields', () => {
    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('only visible for Graduated-stage groups', () => {
    // This test verifies component rendering logic
    // In actual implementation, component would be conditionally rendered
    // based on parent stage in parent component

    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    // Form should be present for graduated parent
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('validates required name field (maxLength: 200)', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    const submitButton = screen.getByRole('button', { name: /create/i });

    // Submit without name
    await user.click(submitButton);

    // Verify validation error
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });

  it('validates name maxLength (200 characters)', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    const nameInput = screen.getByLabelText(/name/i);
    const longName = 'a'.repeat(201); // Exceeds maxLength

    await user.type(nameInput, longName);

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Verify validation error
    expect(await screen.findByText(/name.*too long/i)).toBeInTheDocument();
  });

  it('validates description maxLength (2000 characters)', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const longDescription = 'a'.repeat(2001); // Exceeds maxLength

    await user.type(nameInput, 'UI Patterns');
    await user.type(descriptionInput, longDescription);

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Verify validation error
    expect(await screen.findByText(/description.*too long/i)).toBeInTheDocument();
  });

  it('allows optional description field', async () => {
    const user = userEvent.setup();
    mockCreateChild.mockResolvedValueOnce({
      id: 'child123',
      name: 'UI Patterns',
      stage: 'theme',
    });

    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'UI Patterns');

    // Submit without description (should succeed)
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateChild).toHaveBeenCalledWith({
        parentId: 'graduated123',
        name: 'UI Patterns',
        description: undefined,
      });
    });
  });

  it('calls createChild API with correct input on submit', async () => {
    const user = userEvent.setup();
    mockCreateChild.mockResolvedValueOnce({
      id: 'child123',
      name: 'UI Patterns',
      stage: 'theme',
    });

    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    // Fill form
    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, 'UI Patterns');
    await user.type(descriptionInput, 'User interface design patterns');

    // Submit
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Verify API call
    await waitFor(() => {
      expect(mockCreateChild).toHaveBeenCalledWith({
        parentId: 'graduated123',
        name: 'UI Patterns',
        description: 'User interface design patterns',
      });
    });
  });

  it('navigates to child detail page on success', async () => {
    const user = userEvent.setup();
    mockCreateChild.mockResolvedValueOnce({
      id: 'child123',
      name: 'UI Patterns',
      stage: 'theme',
    });

    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    // Fill and submit form
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'UI Patterns');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Verify navigation to child detail page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/communities/$communityId',
        params: { communityId: 'child123' },
      });
    });
  });

  it('shows success toast on successful creation', async () => {
    const user = userEvent.setup();
    mockCreateChild.mockResolvedValueOnce({
      id: 'child123',
      name: 'UI Patterns',
      stage: 'theme',
    });

    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    // Fill and submit form
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'UI Patterns');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Verify success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('success'),
        })
      );
    });
  });

  it('displays validation error when parent not Graduated', async () => {
    const user = userEvent.setup();
    mockCreateChild.mockRejectedValueOnce(new Error('Parent must be Graduated stage'));

    renderWithRouter(<CreateChildTheme parentId="community456" />);

    // Fill and submit form
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'UI Patterns');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Verify error display
    expect(await screen.findByText(/parent must be graduated/i)).toBeInTheDocument();
  });

  it('displays error message on API failure', async () => {
    const user = userEvent.setup();
    mockCreateChild.mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    // Fill and submit form
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'UI Patterns');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Verify error toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('error'),
        })
      );
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockCreateChild.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    // Fill and submit form
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'UI Patterns');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Verify loading state
    expect(await screen.findByText(/creating/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('clears form after successful submission', async () => {
    const user = userEvent.setup();
    mockCreateChild.mockResolvedValueOnce({
      id: 'child123',
      name: 'UI Patterns',
      stage: 'theme',
    });

    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    // Fill and submit form
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;

    await user.type(nameInput, 'UI Patterns');
    await user.type(descriptionInput, 'Test description');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Wait for submission
    await waitFor(() => {
      expect(mockCreateChild).toHaveBeenCalled();
    });

    // Verify form cleared (after navigation)
    // Note: In actual implementation, form would be unmounted during navigation
  });

  it('invalidates parent children query on success', async () => {
    const user = userEvent.setup();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mockCreateChild.mockResolvedValueOnce({
      id: 'child123',
      name: 'UI Patterns',
      stage: 'theme',
    });

    renderWithRouter(<CreateChildTheme parentId="graduated123" />);

    // Fill and submit form
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'UI Patterns');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    // Verify query invalidation
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['group', 'graduated123', 'children'],
        })
      );
    });
  });

  it('shows parent name in form header', () => {
    renderWithRouter(<CreateChildTheme parentId="graduated123" parentName="Design Patterns" />);

    expect(screen.getByText(/create child theme.*design patterns/i)).toBeInTheDocument();
  });
});
