import type { HiringData, HiringDataDto, HiringDocumentKey, HiringDto } from '@docunex/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const hiringDataKey = ['profile', 'hiring'] as const;

/** Datos para el contrato (IBAN, NUSS…), guardados en el perfil. */
export function useHiringData() {
  return useQuery({
    queryKey: hiringDataKey,
    queryFn: () => api<HiringDataDto>('/profile/hiring'),
  });
}

export function useUpdateHiringData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HiringData) =>
      api<HiringDataDto>('/profile/hiring', { method: 'PUT', json: input }),
    onSuccess: (data) => {
      queryClient.setQueryData(hiringDataKey, data);
      // El estado de la segunda fase de cada solicitud depende de estos datos.
      void queryClient.invalidateQueries({ queryKey: ['hiring'] });
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

/** Segunda fase de una solicitud: datos y lista de documentos con su estado. */
export function useHiring(applicationId: string) {
  return useQuery({
    queryKey: ['hiring', applicationId],
    queryFn: () => api<HiringDto>(`/applications/${applicationId}/hiring`),
  });
}

export function useSetHiringDocuments(applicationId: string, key: HiringDocumentKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentIds: string[]) =>
      api<HiringDto>(`/applications/${applicationId}/hiring/documents/${key}`, {
        method: 'PUT',
        json: { documentIds },
      }),
    onSuccess: (hiring) => {
      queryClient.setQueryData(['hiring', applicationId], hiring);
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function hiringFileUrl(applicationId: string): string {
  return `/api/applications/${applicationId}/hiring/file`;
}
