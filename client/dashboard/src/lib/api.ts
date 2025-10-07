// oRPC API client for Atrarium backend
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ClientRouter } from '@atrarium/contracts';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Create RPC link with authentication
const link = new RPCLink({
  url: baseURL,
  headers: () => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('auth_token');

    // Return authorization header if token exists
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },
});

// Create type-safe oRPC client using RouterClient type
// This provides full compile-time type safety from server to client
export const apiClient: ClientRouter = createORPCClient(link);

export default apiClient;
