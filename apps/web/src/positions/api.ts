import type { PositionDto, PositionInput } from '@docunex/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const positionsKey = ['positions'] as const;

export function usePositions() {
  return useQuery({ queryKey: positionsKey, queryFn: () => api<PositionDto[]>('/positions') });
}

/** Tras cambiar una plaza cambian también las solicitudes que la muestran. */
function useInvalidatePositions() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: positionsKey });
    void queryClient.invalidateQueries({ queryKey: ['applications'] });
  };
}

export function useSavePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: PositionInput }) =>
      id
        ? api<PositionDto>(`/positions/${id}`, { method: 'PUT', json: input })
        : api<PositionDto>('/positions', { method: 'POST', json: input }),
    onSuccess: invalidate,
  });
}

export function useDeletePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/positions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
