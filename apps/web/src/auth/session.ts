import type { LoginInput, SessionUser } from '@docunex/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';

export const sessionQueryKey = ['session'] as const;

/** Usuario de la sesión actual, o `null` si no hay sesión. */
export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: async (): Promise<SessionUser | null> => {
      try {
        return await api<SessionUser>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: Infinity,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      api<SessionUser>('/auth/login', { method: 'POST', json: input }),
    onSuccess: (user) => queryClient.setQueryData(sessionQueryKey, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.removeQueries();
      queryClient.setQueryData(sessionQueryKey, null);
    },
  });
}
