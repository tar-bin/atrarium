import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { PDSProvider } from './contexts/PDSContext';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import { Toaster } from './components/ui/toaster';
import './index.css';

// ReactQueryDevtools removed from production build to avoid dependency issues

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PDSProvider>
        <RouterProvider router={router} />
        <Toaster />
      </PDSProvider>
    </QueryClientProvider>
  </StrictMode>
)
