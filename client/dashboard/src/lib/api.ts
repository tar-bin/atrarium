// oRPC API client for Atrarium backend
// TODO: Update to oRPC v1.9.3 API - links parameter may have changed
import { createORPCClient } from '@orpc/client';
// import { RPCLink } from '@orpc/client/fetch';
// import type { Router } from '../../../../server/src/router';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Create type-safe oRPC client (placeholder until API updated)
export const apiClient = createORPCClient({
  // TODO: Configure proper links/transport for oRPC v1.9.3
  baseURL: `${baseURL}/api`,
  headers: () => {
    // Get JWT token from localStorage or context
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
} as any);

export default apiClient;
