import type {
  PositionDto,
  PositionInput,
  UexImportInput,
  UexPositionListDto,
  UexSyncResult,
} from '@docunex/shared';
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

const uexPositionsKey = ['uex-positions'] as const;

/** Plazas publicadas en la web de la UEx. Solo se consultan con `enabled`. */
export function useUexPositions(enabled: boolean) {
  return useQuery({
    queryKey: uexPositionsKey,
    queryFn: () => api<UexPositionListDto>('/uex-positions'),
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

/** Vuelve a leer la página de la UEx (sin la copia que guarda la API). */
export function useRefreshUexPositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<UexPositionListDto>('/uex-positions?refresh=true'),
    onSuccess: (listing) => queryClient.setQueryData(uexPositionsKey, listing),
  });
}

export function useImportUexPositions() {
  const invalidate = useInvalidatePositions();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UexImportInput) =>
      api<PositionDto[]>('/uex-positions/import', { method: 'POST', json: input }),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: uexPositionsKey });
    },
  });
}

/** Actualiza la fase de las plazas del usuario con lo publicado en la web de la UEx. */
export function useSyncUexPositions() {
  const invalidate = useInvalidatePositions();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<UexSyncResult>('/uex-positions/sync', { method: 'POST' }),
    onSuccess: () => {
      invalidate();
      // La API acaba de volver a leer la web: la lista del buscador también ha cambiado.
      void queryClient.invalidateQueries({ queryKey: uexPositionsKey });
    },
  });
}
