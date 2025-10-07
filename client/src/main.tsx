import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from './components/ui/toaster';
import { LayoutProvider } from './contexts/LayoutContext';
import { PDSProvider } from './contexts/PDSContext';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import './index.css';

// ReactQueryDevtools removed from production build to avoid dependency issues

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PDSProvider>
        <LayoutProvider>
          <RouterProvider router={router} />
          <Toaster />
        </LayoutProvider>
      </PDSProvider>
    </QueryClientProvider>
  </StrictMode>
);
