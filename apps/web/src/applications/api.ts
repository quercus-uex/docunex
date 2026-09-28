import type {
  ApplicationDto,
  PackageDto,
  PackageSummaryDto,
  RegistryEntryInput,
  UpdateApplicationInput,
  ValidationResult,
} from '@docunex/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../api/client';

const applicationsKey = ['applications'] as const;

export function useApplications() {
  return useQuery({
    queryKey: applicationsKey,
    queryFn: () => api<ApplicationDto[]>('/applications'),
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: [...applicationsKey, id],
    queryFn: () => api<ApplicationDto>(`/applications/${id}`),
  });
}

/** Guarda la solicitud devuelta por la API en la caché y refresca lo que depende de ella. */
function useStoreApplication() {
  const queryClient = useQueryClient();
  return (application: ApplicationDto) => {
    queryClient.setQueryData([...applicationsKey, application.id], application);
    void queryClient.invalidateQueries({ queryKey: applicationsKey, exact: true });
    void queryClient.invalidateQueries({ queryKey: ['positions'] });
    void queryClient.invalidateQueries({ queryKey: ['documents'] });
    void queryClient.invalidateQueries({ queryKey: ['validation', application.id] });
  };
}

export function useCreateApplication() {
  const store = useStoreApplication();
  return useMutation({
    mutationFn: (positionId: string) =>
      api<ApplicationDto>('/applications', { method: 'POST', json: { positionId } }),
    onSuccess: store,
  });
}

export function useUpdateApplication(id: string) {
  const store = useStoreApplication();
  return useMutation({
    mutationFn: (input: UpdateApplicationInput) =>
      api<ApplicationDto>(`/applications/${id}`, { method: 'PATCH', json: input }),
    onSuccess: store,
  });
}

export function useSetApplicationMerits(id: string) {
  const store = useStoreApplication();
  return useMutation({
    mutationFn: (meritIds: string[]) =>
      api<ApplicationDto>(`/applications/${id}/merits`, { method: 'PUT', json: { meritIds } }),
    onSuccess: store,
  });
}

export function useSetRequirementDocuments(id: string) {
  const store = useStoreApplication();
  return useMutation({
    mutationFn: (documentIds: string[]) =>
      api<ApplicationDto>(`/applications/${id}/requirement-documents`, {
        method: 'PUT',
        json: { documentIds },
      }),
    onSuccess: store,
  });
}

/** Anota el nº de registro: la solicitud pasa a registrada. */
export function useRegisterApplication(id: string) {
  const store = useStoreApplication();
  return useMutation({
    mutationFn: (input: RegistryEntryInput) =>
      api<ApplicationDto>(`/applications/${id}/registry-entries`, { method: 'POST', json: input }),
    onSuccess: store,
  });
}

export function useUpdateRegistryEntry(id: string) {
  const store = useStoreApplication();
  return useMutation({
    mutationFn: ({ entryId, ...input }: RegistryEntryInput & { entryId: string }) =>
      api<ApplicationDto>(`/applications/${id}/registry-entries/${entryId}`, {
        method: 'PATCH',
        json: input,
      }),
    onSuccess: store,
  });
}

/** Cierra o reabre una solicitud registrada. */
export function useSetApplicationStatus(id: string) {
  const store = useStoreApplication();
  return useMutation({
    mutationFn: (status: 'registered' | 'closed') =>
      api<ApplicationDto>(`/applications/${id}/status`, { method: 'PATCH', json: { status } }),
    onSuccess: store,
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/applications/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationsKey });
      void queryClient.invalidateQueries({ queryKey: ['positions'] });
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useValidation(id: string, enabled = true) {
  return useQuery({
    queryKey: ['validation', id],
    queryFn: () => api<ValidationResult>(`/applications/${id}/validation`),
    enabled,
    // Depende también de méritos, documentos y perfil: se recalcula al volver al paso.
    staleTime: 0,
  });
}

export function useGenerate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<PackageSummaryDto>(`/applications/${id}/packages`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [...applicationsKey, id] }),
  });
}

export function usePackage(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['packages', id],
    queryFn: () => api<PackageDto>(`/packages/${id}`),
    enabled: id !== undefined && enabled,
  });
}

export function packageFileUrl(id: string): string {
  return `/api/packages/${id}/file`;
}

/**
 * Sigue la generación por SSE. Devuelve el último estado recibido; al terminar refresca la solicitud
 * y el expediente completo.
 */
export function usePackageProgress(pkg: PackageSummaryDto | null | undefined) {
  const queryClient = useQueryClient();
  const [live, setLive] = useState<PackageSummaryDto | null>(null);
  const running = pkg?.status === 'queued' || pkg?.status === 'running';
  const id = pkg?.id;

  useEffect(() => {
    if (!running || !id) return;
    const source = new EventSource(`/api/packages/${id}/events`);
    source.onmessage = (event: MessageEvent<string>) => {
      const summary = JSON.parse(event.data) as PackageSummaryDto;
      setLive(summary);
      if (summary.status === 'done' || summary.status === 'failed') {
        source.close();
        void queryClient.invalidateQueries({ queryKey: applicationsKey });
        void queryClient.invalidateQueries({ queryKey: ['packages', id] });
      }
    };
    // Si se corta, EventSource reintenta solo; al terminar el servidor cierra y no hay reintento útil.
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) source.close();
    };
    return () => source.close();
  }, [id, running, queryClient]);

  return live?.id === id ? live : (pkg ?? null);
}
