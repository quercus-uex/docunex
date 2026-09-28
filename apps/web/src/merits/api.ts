import type { MeritDto, MeritInputData } from '@docunex/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const meritsKey = ['merits'] as const;

export function useMerits() {
  return useQuery({ queryKey: meritsKey, queryFn: () => api<MeritDto[]>('/merits') });
}

export function useMerit(id: string | undefined) {
  return useQuery({
    queryKey: [...meritsKey, id],
    queryFn: () => api<MeritDto>(`/merits/${id}`),
    enabled: id !== undefined,
  });
}

/** Tras cambiar un mérito cambian también los usos de sus documentos. */
function useInvalidateMerits() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: meritsKey });
    void queryClient.invalidateQueries({ queryKey: ['documents'] });
  };
}

export function useSaveMerit() {
  const invalidate = useInvalidateMerits();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MeritInputData }) =>
      id
        ? api<MeritDto>(`/merits/${id}`, { method: 'PUT', json: input })
        : api<MeritDto>('/merits', { method: 'POST', json: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteMerit() {
  const invalidate = useInvalidateMerits();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/merits/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
