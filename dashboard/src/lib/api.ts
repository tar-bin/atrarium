// Simple API client placeholder
// TODO: Implement proper oRPC client when backend types are available
// const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const apiClient = {
  api: {
    communities: {
      $get: async () => ({ data: [] }),
    },
    posts: {
      $get: async () => ({ data: [] }),
    },
    moderation: {
      logs: {
        $get: async () => ({ data: [] }),
      },
    },
  },
};

export default apiClient;
