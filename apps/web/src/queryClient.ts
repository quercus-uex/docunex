import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/client';
import { sessionQueryKey } from './auth/session';

export const queryClient: QueryClient = new QueryClient({
  // Si cualquier consulta recibe 401, la sesión ha caducado: se olvida y RequireAuth lleva al login.
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        queryClient.setQueryData(sessionQueryKey, null);
      }
    },
  }),
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});
