import {
  cvSectionHeading,
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
  Checkbox,
  Group,
  Loader,
  Menu,
  Modal,
  Popover,
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
import { Link } from 'react-router';
import { formatBytes, formatIsoDate } from '../utils/format';
import {
  documentFileUrl,
  useDeleteDocument,
  useDocuments,
  useDocumentUsages,
  useReprocessDocument,
} from './api';
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
  const [unused, setUnused] = useState(false);
  const {
    data: documents,
    isPending,
    error,
  } = useDocuments({
    q,
    kind: kind ?? undefined,
    unused,
  });
  const [editing, setEditing] = useState<DocumentDto | null>(null);
  const [deleting, setDeleting] = useState<DocumentDto | null>(null);
  const filtered = q !== '' || kind !== null || unused;

  return (
    <Stack>
      <Title order={2}>Documentos</Title>
      <Text c="dimmed" maw={960}>
        Aquí están todos tus documentos acreditativos. Cada uno se convierte a PDF para poder
        incluirlo en el expediente. Súbelos una sola vez: después los vincularás a tus méritos y los
        reutilizarás en todas las solicitudes.
      </Text>

      <UploadDropzone />

      <Alert variant="light" color="gray">
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
          w={{ base: '100%', xs: 320 }}
          aria-label="Buscar documentos por nombre"
        />
        <Select
          placeholder="Todos los tipos"
          data={KIND_OPTIONS}
          value={kind}
          onChange={(value) => setKind(value as DocumentKind | null)}
          clearable
          w={{ base: '100%', xs: 280 }}
          aria-label="Filtrar por tipo de documento"
        />
        <Checkbox
          label="Solo sin uso"
          checked={unused}
          onChange={(event) => setUnused(event.currentTarget.checked)}
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
        <Table.ScrollContainer minWidth={860}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Uso</Table.Th>
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
      <Table.Td>
        <UsageCell document={document} />
      </Table.Td>
      <Table.Td ta="right">{document.pageCount ?? '—'}</Table.Td>
      <Table.Td ta="right">{formatBytes(document.pdfSize ?? document.originalSize)}</Table.Td>
      <Table.Td>{formatIsoDate(document.issuedAt)}</Table.Td>
      <Table.Td>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label={`Acciones de ${document.name}`}>
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

function UsageCell({ document }: { document: DocumentDto }) {
  const [opened, setOpened] = useState(false);
  const { merits, applications, idDocument } = document.usage;
  if (merits === 0 && applications === 0) {
    return idDocument ? (
      <Badge variant="light" color="grape">
        DNI (perfil)
      </Badge>
    ) : (
      <Text size="sm" c="dimmed">
        Sin uso
      </Text>
    );
  }
  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" withArrow shadow="md">
      <Popover.Target>
        <Anchor component="button" type="button" size="sm" onClick={() => setOpened((o) => !o)}>
          {[
            merits > 0 && (merits === 1 ? '1 mérito' : `${merits} méritos`),
            applications > 0 &&
              (applications === 1 ? '1 solicitud' : `${applications} solicitudes`),
            idDocument && 'DNI',
          ]
            .filter(Boolean)
            .join(' · ')}
        </Anchor>
      </Popover.Target>
      <Popover.Dropdown maw={420}>
        <UsageList id={document.id} enabled={opened} />
      </Popover.Dropdown>
    </Popover>
  );
}

function UsageList({ id, enabled }: { id: string; enabled: boolean }) {
  const { data, isPending } = useDocumentUsages(id, enabled);
  if (isPending) return <Loader size="sm" />;
  return (
    <Stack gap={6}>
      {data?.merits.map((merit) => (
        <div key={merit.id}>
          <Anchor component={Link} to={`/meritos/${merit.id}`} size="sm">
            {merit.summary}
          </Anchor>
          <Text size="xs" c="dimmed">
            {cvSectionHeading(merit.cvSection)}
          </Text>
        </div>
      ))}
      {data?.applications.map((application) => (
        <div key={`${application.id}-${application.role}`}>
          <Anchor
            component={Link}
            to={`/solicitudes/${application.id}${application.role === 'hiring' ? '/contratacion' : ''}`}
            size="sm"
          >
            Solicitud {application.positionCode}
          </Anchor>
          <Text size="xs" c="dimmed">
            {application.role === 'hiring'
              ? 'Documentación de la segunda fase (contratación)'
              : 'Documento de requisitos (bloque 5)'}
          </Text>
        </div>
      ))}
      {data?.idDocument && <Text size="sm">Copia del DNI del perfil</Text>}
    </Stack>
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
  const merits = document?.usage.merits ?? 0;
  const applications = document?.usage.applications ?? 0;
  const inUse = merits > 0 || applications > 0;
  return (
    <Modal opened={document !== null} onClose={onClose} title="Eliminar documento">
      <Stack>
        {inUse ? (
          <Alert color="yellow" variant="light">
            «{document?.name}» se usa en{' '}
            {[
              merits > 0 && (merits === 1 ? 'un mérito' : `${merits} méritos`),
              applications > 0 &&
                (applications === 1 ? 'una solicitud' : `${applications} solicitudes`),
            ]
              .filter(Boolean)
              .join(' y ')}
            . Quítalo de ahí antes de eliminarlo.
          </Alert>
        ) : (
          <Text>
            ¿Seguro que quieres eliminar «{document?.name}»? Se borrarán el fichero original y su
            versión PDF.
            {document?.usage.idDocument && ' Es la copia del DNI de tu perfil: se quitará de él.'}
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="red"
            loading={remove.isPending}
            disabled={inUse}
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
