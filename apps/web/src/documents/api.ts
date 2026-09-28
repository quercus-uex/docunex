import type {
  DocumentDto,
  DocumentKind,
  DocumentUsagesDto,
  UpdateDocumentInput,
  UploadResult,
} from '@docunex/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export interface DocumentFilters {
  kind?: DocumentKind;
  q?: string;
  unused?: boolean;
}

const documentsKey = ['documents'] as const;

export function documentFileUrl(id: string, variant: 'pdf' | 'original' = 'pdf'): string {
  return `/api/documents/${id}/file?variant=${variant}`;
}

export function useDocuments(filters: DocumentFilters = {}) {
  const params = new URLSearchParams();
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.q) params.set('q', filters.q);
  if (filters.unused) params.set('unused', 'true');
  const query = params.size > 0 ? `?${params}` : '';

  return useQuery({
    queryKey: [...documentsKey, filters],
    queryFn: () => api<DocumentDto[]>(`/documents${query}`),
    // Mientras haya documentos procesándose, se consulta periódicamente su estado.
    refetchInterval: (current) =>
      current.state.data?.some((document) => document.status === 'processing') ? 1500 : false,
  });
}

export function useDocumentUsages(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...documentsKey, id, 'usages'],
    queryFn: () => api<DocumentUsagesDto>(`/documents/${id}/usages`),
    enabled,
  });
}

export function useUploadDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files, kind }: { files: File[]; kind?: DocumentKind }) => {
      const body = new FormData();
      if (kind) body.append('kind', kind);
      for (const file of files) body.append('files', file);
      return api<UploadResult[]>('/documents', { method: 'POST', body });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsKey }),
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDocumentInput }) =>
      api<DocumentDto>(`/documents/${id}`, { method: 'PATCH', json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsKey }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentsKey });
      // El perfil puede apuntar al documento borrado (copia del DNI).
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useReprocessDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<DocumentDto>(`/documents/${id}/reprocess`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsKey }),
  });
}
