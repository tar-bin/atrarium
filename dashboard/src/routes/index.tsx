import { createFileRoute, redirect, Navigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PDSLoginForm } from '@/components/pds/PDSLoginForm';
import { usePDS } from '@/contexts/PDSContext';
import { useEffect } from 'react';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { session } = usePDS();
  const pdsUrl = import.meta.env.VITE_PDS_URL || 'http://localhost:3000';

  // Redirect to communities if already logged in
  if (session.isAuthenticated) {
    return <Navigate to="/communities" />;
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Atrarium</CardTitle>
            <CardDescription>
              Login to manage your communities and feeds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PDSLoginForm pdsUrl={pdsUrl} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
