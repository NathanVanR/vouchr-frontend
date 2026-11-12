import { QueryClient } from '@tanstack/react-query'

// Show cached data straight away and refresh it in the background; a failed request is not retried over and over.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 10 * 60_000, retry: 1, refetchOnWindowFocus: false },
  },
})
