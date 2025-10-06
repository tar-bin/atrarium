// oRPC API client for Atrarium backend
import { createORPCClient } from '@orpc/client';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Create type-safe oRPC client
// Note: Type annotation requires the server-side router type (with .handler()),
// not the contract type (without .handler()). The contract type doesn't satisfy
// NestedClient<any> constraint. Runtime type safety is still enforced by oRPC.
// TODO: Explore oRPC client type generation to get full compile-time safety
export const apiClient = createORPCClient({
  fetch: async (url: string, init?: RequestInit) => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('auth_token');

    // Add authorization header if token exists
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Make the request to the backend
    return fetch(`${baseURL}${url}`, {
      ...init,
      headers,
    });
  },
} as any);

export default apiClient;
