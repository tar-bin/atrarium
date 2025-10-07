// oRPC React Query hooks for type-safe API calls
// oRPC v1.9.3 uses @tanstack/react-query directly
import {
  useMutation as useTanstackMutation,
  useQuery as useTanstackQuery,
} from '@tanstack/react-query';
import { apiClient } from './api';

// Helper to create type-safe query hooks
export function useQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: Parameters<typeof useTanstackQuery<T>>[0]
) {
  return useTanstackQuery<T>({
    queryKey,
    queryFn,
    ...options,
  });
}

// Helper to create type-safe mutation hooks
export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Parameters<typeof useTanstackMutation<TData, Error, TVariables>>[0]
) {
  return useTanstackMutation<TData, Error, TVariables>({
    mutationFn,
    ...options,
  });
}

// Export apiClient for direct usage
export { apiClient };
