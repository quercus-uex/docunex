import {
  ACCEPTED_UPLOAD_TYPES,
  DOCUMENT_KIND_LABELS,
  type DocumentDto,
  type DocumentKind,
  MAX_MERIT_DOCUMENTS,
} from '@docunex/shared';
import {
  ActionIcon,
  Anchor,
  Button,
  FileButton,
  Group,
  Paper,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconEdit, IconUpload, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { documentFileUrl, useDocuments, useUploadDocuments } from '../documents/api';
import { DocumentEditModal } from '../documents/DocumentEditModal';
import { DocumentStatusBadge } from '../documents/DocumentStatusBadge';
import { notifyUploadResults } from '../documents/uploadNotifications';

const ACCEPT = Object.keys(ACCEPTED_UPLOAD_TYPES).join(',');

/** Lista ordenada de documentos (justificantes de un mérito o requisitos de una solicitud). */
export function MeritDocumentsField({
  value,
  onChange,
  uploadKind,
  error,
  readOnly = false,
  preferredKinds = [],
  emptyText = 'Sin justificantes. El mérito se puede guardar, pero no se podrá incluir en una solicitud hasta que tenga al menos uno.',
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  uploadKind: DocumentKind;
  error?: string;
  /** Solo muestra la lista, sin poder cambiarla. */
  readOnly?: boolean;
  /** Tipos de documento que se proponen primero al añadir uno ya subido. */
  preferredKinds?: readonly DocumentKind[];
  emptyText?: string;
}) {
  const { data: documents = [] } = useDocuments();
  const upload = useUploadDocuments();
  const [editing, setEditing] = useState<DocumentDto | null>(null);
  const byId = new Map(documents.map((document) => [document.id, document]));
  const full = value.length >= MAX_MERIT_DOCUMENTS;

  const preferred = (document: DocumentDto) => Number(preferredKinds.includes(document.kind));
  const options = documents
    .filter((document) => !value.includes(document.id))
    .sort((a, b) => preferred(b) - preferred(a))
    .map((document) => ({
      value: document.id,
      label: `${document.name} (${DOCUMENT_KIND_LABELS[document.kind]})`,
    }));

  const add = (ids: string[]) => {
    const next = [...value];
    for (const id of ids) if (!next.includes(id)) next.push(id);
    onChange(next.slice(0, MAX_MERIT_DOCUMENTS));
  };

  const move = (index: number, offset: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item!);
    onChange(next);
  };

  const uploadFiles = (files: File[]) => {
    if (files.length === 0) return;
    upload.mutate(
      { files, kind: uploadKind },
      {
        onSuccess: (results) => {
          notifyUploadResults(results);
          add(
            results.flatMap((result) => (result.status === 'rejected' ? [] : [result.document.id])),
          );
        },
      },
    );
  };

  return (
    <Stack gap="xs">
      {value.length === 0 ? (
        <Text size="sm" c="dimmed">
          {emptyText}
        </Text>
      ) : (
        value.map((id, index) => {
          const document = byId.get(id);
          return (
            <Paper key={id} withBorder px="sm" py={6}>
              <Group wrap="nowrap" gap="sm">
                <Text size="sm" c="dimmed" w={20}>
                  {index + 1}.
                </Text>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {document ? (
                    <Anchor href={documentFileUrl(id)} target="_blank" size="sm" fw={500}>
                      {document.name}
                    </Anchor>
                  ) : (
                    <Text size="sm" c="dimmed">
                      Documento no disponible
                    </Text>
                  )}
                  {document?.pageCount != null && (
                    <Text size="xs" c="dimmed">
                      {document.pageCount} {document.pageCount === 1 ? 'página' : 'páginas'}
                    </Text>
                  )}
                </div>
                {document && <DocumentStatusBadge document={document} />}
                {!readOnly && (
                  <Group gap={2} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label="Subir"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <IconArrowUp size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label="Bajar"
                      disabled={index === value.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <IconArrowDown size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label="Editar nombre"
                      disabled={!document}
                      onClick={() => document && setEditing(document)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="Quitar"
                      onClick={() => onChange(value.filter((other) => other !== id))}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                )}
              </Group>
            </Paper>
          );
        })
      )}
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
      {!readOnly && (
        <Group align="flex-end">
          <Select
            aria-label="Añadir un documento ya subido"
            placeholder="Añadir un documento ya subido"
            data={options}
            value={null}
            onChange={(id) => id && add([id])}
            searchable
            nothingFoundMessage="No hay más documentos"
            disabled={full}
            style={{ flex: 1 }}
          />
          <FileButton onChange={uploadFiles} accept={ACCEPT} multiple disabled={full}>
            {(props) => (
              <Button
                {...props}
                variant="default"
                leftSection={<IconUpload size={16} />}
                loading={upload.isPending}
                disabled={full}
              >
                Subir
              </Button>
            )}
          </FileButton>
        </Group>
      )}
      <DocumentEditModal document={editing} onClose={() => setEditing(null)} />
    </Stack>
  );
}
