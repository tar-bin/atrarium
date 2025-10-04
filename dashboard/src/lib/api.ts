import { createClient } from 'orpc/client';
import type { AppType } from '../../../src/index';

// Create type-safe API client using backend Hono app types
export const apiClient = createClient<AppType>({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8787',
});

// Export for use with TanStack Query
export default apiClient;
