import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Layout } from '@/components/layout/Layout';

describe('Layout Component', () => {
  it('renders children inside layout', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders Sidebar component', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    // Sidebar should contain navigation links
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders Header component', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    // Header should contain app title
    expect(screen.getByText(/Atrarium Dashboard/i)).toBeInTheDocument();
  });

  it('applies responsive grid layout classes', () => {
    const { container } = render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    // Check for grid layout classes (Tailwind CSS)
    const layoutElement = container.querySelector('.grid, [class*="grid"]');
    expect(layoutElement).toBeInTheDocument();
  });
});
