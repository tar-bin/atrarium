// oRPC React Query hooks for type-safe API calls
import { createORPCReact } from '@orpc/react';
import { apiClient } from './api';

// Create type-safe React hooks
export const { useQuery, useMutation, useSuspenseQuery } = createORPCReact({
  client: apiClient,
});
