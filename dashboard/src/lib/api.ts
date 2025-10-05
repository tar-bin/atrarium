// oRPC API client for Atrarium backend
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { Router } from '../../../src/router';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Create type-safe oRPC client
export const apiClient = createORPCClient<Router>({
  links: [
    new RPCLink({
      url: `${baseURL}/api`,
      headers: () => {
        // Get JWT token from localStorage or context
        const token = localStorage.getItem('auth_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export default apiClient;
