import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Layout } from '@/components/layout/Layout';

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-lg border bg-destructive/10 p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-destructive">Error</h1>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}
