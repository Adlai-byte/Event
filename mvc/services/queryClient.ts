import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 30 * 60 * 1000,        // 30 minutes (was cacheTime)
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
