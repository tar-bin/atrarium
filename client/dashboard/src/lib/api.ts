// oRPC API client for Atrarium backend
import { createORPCClient } from '@orpc/client';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Create type-safe oRPC client using fetch
// oRPC v1.9.3 uses a simpler API without explicit links
// Note: Type annotation removed due to oRPC v1.9.3 client type complexity
// The client proxy will provide runtime type safety through the Router definition
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
} as any); // Type assertion needed for oRPC client proxy

export default apiClient;
