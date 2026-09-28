import {
  DOCUMENT_KIND_LABELS,
  DOCUMENT_KINDS,
  type DocumentDto,
  type DocumentKind,
} from '@docunex/shared';
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Menu,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconDots,
  IconEdit,
  IconExternalLink,
  IconFile,
  IconRefresh,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { formatBytes, formatIsoDate } from '../utils/format';
import { documentFileUrl, useDeleteDocument, useDocuments, useReprocessDocument } from './api';
import { DocumentEditModal } from './DocumentEditModal';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { UploadDropzone } from './UploadDropzone';

const KIND_OPTIONS = DOCUMENT_KINDS.map((kind) => ({
  value: kind,
  label: DOCUMENT_KIND_LABELS[kind],
}));

export function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search.trim(), 300);
  const [kind, setKind] = useState<DocumentKind | null>(null);
  const { data: documents, isPending, error } = useDocuments({ q, kind: kind ?? undefined });
  const [editing, setEditing] = useState<DocumentDto | null>(null);
  const [deleting, setDeleting] = useState<DocumentDto | null>(null);
  const filtered = q !== '' || kind !== null;

  return (
    <Stack>
      <Title order={2}>Documentos</Title>
      <Text c="dimmed" maw={760}>
        Aquí están todos tus documentos acreditativos. Cada uno se convierte a PDF para poder
        incluirlo en el expediente. Súbelos una sola vez: después los vincularás a tus méritos y los
        reutilizarás en todas las solicitudes.
      </Text>

      <UploadDropzone />

      <Alert variant="light" color="gray" maw={760}>
        Al combinar los justificantes en el PDF único del expediente, las firmas digitales
        incrustadas en ellos dejan de poder verificarse. Los códigos de verificación (CSV) impresos
        en las páginas se conservan.
      </Alert>

      <Group>
        <TextInput
          placeholder="Buscar por nombre"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          w={260}
        />
        <Select
          placeholder="Todos los tipos"
          data={KIND_OPTIONS}
          value={kind}
          onChange={(value) => setKind(value as DocumentKind | null)}
          clearable
          w={240}
        />
      </Group>

      {error && (
        <Alert color="red" title="No se pudieron cargar los documentos">
          {error.message}
        </Alert>
      )}
      {isPending ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : documents && documents.length > 0 ? (
        <Table.ScrollContainer minWidth={760}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th ta="right">Páginas</Table.Th>
                <Table.Th ta="right">Tamaño</Table.Th>
                <Table.Th>Emisión</Table.Th>
                <Table.Th w={48} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  onEdit={() => setEditing(document)}
                  onDelete={() => setDeleting(document)}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      ) : (
        <Text c="dimmed" py="lg">
          {filtered
            ? 'Ningún documento coincide con el filtro.'
            : 'Todavía no has subido documentos.'}
        </Text>
      )}

      <DocumentEditModal document={editing} onClose={() => setEditing(null)} />
      <DeleteDocumentModal document={deleting} onClose={() => setDeleting(null)} />
    </Stack>
  );
}

function DocumentRow({
  document,
  onEdit,
  onDelete,
}: {
  document: DocumentDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const reprocess = useReprocessDocument();
  const ready = document.status === 'ready';

  return (
    <Table.Tr>
      <Table.Td>
        {ready ? (
          <Anchor href={documentFileUrl(document.id)} target="_blank" fw={500}>
            {document.name}
          </Anchor>
        ) : (
          <Text fw={500}>{document.name}</Text>
        )}
        {document.originalFilename !==
          `${document.name}${extensionOf(document.originalFilename)}` && (
          <Text size="xs" c="dimmed">
            {document.originalFilename}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Badge variant="outline" color="gray">
          {DOCUMENT_KIND_LABELS[document.kind]}
        </Badge>
      </Table.Td>
      <Table.Td>
        <DocumentStatusBadge document={document} />
      </Table.Td>
      <Table.Td ta="right">{document.pageCount ?? '—'}</Table.Td>
      <Table.Td ta="right">{formatBytes(document.pdfSize ?? document.originalSize)}</Table.Td>
      <Table.Td>{formatIsoDate(document.issuedAt)}</Table.Td>
      <Table.Td>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label="Acciones">
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              component="a"
              href={documentFileUrl(document.id)}
              target="_blank"
              leftSection={<IconExternalLink size={16} />}
              disabled={!ready}
            >
              Ver PDF
            </Menu.Item>
            <Menu.Item
              component="a"
              href={documentFileUrl(document.id, 'original')}
              target="_blank"
              leftSection={<IconFile size={16} />}
            >
              Ver original
            </Menu.Item>
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={onEdit}>
              Editar
            </Menu.Item>
            {document.status === 'error' && (
              <Menu.Item
                leftSection={<IconRefresh size={16} />}
                onClick={() => reprocess.mutate(document.id)}
              >
                Reprocesar
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={onDelete}>
              Eliminar
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  );
}

function DeleteDocumentModal({
  document,
  onClose,
}: {
  document: DocumentDto | null;
  onClose: () => void;
}) {
  const remove = useDeleteDocument();
  return (
    <Modal opened={document !== null} onClose={onClose} title="Eliminar documento">
      <Stack>
        <Text>
          ¿Seguro que quieres eliminar «{document?.name}»? Se borrarán el fichero original y su
          versión PDF.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="red"
            loading={remove.isPending}
            onClick={() =>
              document &&
              remove.mutate(document.id, {
                onSuccess: () => {
                  notifications.show({ color: 'green', message: 'Documento eliminado' });
                  onClose();
                },
                onError: (error) =>
                  notifications.show({
                    color: 'red',
                    title: 'No se pudo eliminar',
                    message: error.message,
                  }),
              })
            }
          >
            Eliminar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot) : '';
}
