import { type ApplicationDto, formatDocCode, type PackageDto } from '@docunex/shared';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconFileText } from '@tabler/icons-react';
import { formatBytes } from '../../utils/format';
import { packageFileUrl, useGenerate, usePackage, usePackageProgress } from '../api';
import { IssueList } from '../IssueList';

/** ⑤ Generación del expediente y revisión del resultado. */
export function GenerateStep({
  application,
  onBack,
}: {
  application: ApplicationDto;
  onBack: () => void;
}) {
  const generate = useGenerate(application.id);
  const current = usePackageProgress(application.latestPackage);
  const running = current?.status === 'queued' || current?.status === 'running';
  const { data: pkg } = usePackage(current?.id, current?.status === 'done');

  const start = () =>
    generate.mutate(undefined, {
      onError: (error) =>
        notifications.show({ color: 'red', title: 'No se pudo generar', message: error.message }),
    });

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Se une todo en un único PDF: Anexo III, DNI, currículum, hoja índice y documentos, con
          separadores, sellos DOC_nn y marcadores. Cada generación es una versión nueva.
        </Text>
        <Group>
          <Button variant="default" onClick={onBack}>
            Anterior
          </Button>
          <Button onClick={start} loading={generate.isPending} disabled={running}>
            {current ? 'Generar de nuevo' : 'Generar expediente'}
          </Button>
        </Group>
      </Group>

      {running && (
        <Alert
          color="blue"
          variant="light"
          icon={<Loader size="sm" />}
          title={`Generando la versión ${current.version}`}
        >
          {current.progress ?? 'En cola'}…
        </Alert>
      )}
      {current?.status === 'failed' && (
        <IssueList
          issues={current.errors}
          kind="error"
          title={`No se pudo generar la versión ${current.version}`}
        />
      )}
      {current?.status === 'done' && pkg && <PackageResult pkg={pkg} />}
    </Stack>
  );
}

function PackageResult({ pkg }: { pkg: PackageDto }) {
  const url = packageFileUrl(pkg.id);
  return (
    <Stack>
      <Paper withBorder p="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconFileText />
            <div>
              <Text fw={600}>Expediente, versión {pkg.version}</Text>
              <Text size="sm" c="dimmed">
                {pkg.pageCount} páginas · {formatBytes(pkg.size ?? 0)} · {pkg.documents.length}{' '}
                documentos numerados
              </Text>
            </div>
          </Group>
          <Button component="a" href={url} download leftSection={<IconDownload size={16} />}>
            Descargar
          </Button>
        </Group>
      </Paper>
      <IssueList issues={pkg.warnings} kind="warning" title="Avisos" />

      <iframe
        src={url}
        title="Expediente"
        style={{
          width: '100%',
          height: '75vh',
          border: '1px solid var(--mantine-color-default-border)',
        }}
      />

      <Title order={4}>Estructura</Title>
      <Table.ScrollContainer minWidth={420}>
        <Table verticalSpacing={4}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Bloque</Table.Th>
              <Table.Th>Páginas</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pkg.layout.map((block) => (
              <Table.Tr key={block.number}>
                <Table.Td>
                  {block.number}. {block.title}
                </Table.Td>
                <Table.Td>
                  {block.startPage}–{block.endPage}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Title order={4}>Numeración</Title>
      <Table.ScrollContainer minWidth={560}>
        <Table verticalSpacing={4} striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Código</Table.Th>
              <Table.Th>Documento</Table.Th>
              <Table.Th>Bloque</Table.Th>
              <Table.Th ta="right">Página</Table.Th>
              <Table.Th ta="right">Páginas</Table.Th>
              <Table.Th ta="right">Tamaño</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pkg.documents.map((document) => (
              <Table.Tr key={document.code}>
                <Table.Td fw={600}>
                  <Anchor href={`${url}#page=${document.startPage}`} target="_blank" size="sm">
                    {formatDocCode(document.code)}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  {document.name}
                  {document.detail && (
                    <Text size="xs" c="dimmed">
                      {document.detail}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={document.block === 5 ? 'grape' : 'blue'} size="sm">
                    {document.block === 5 ? 'Requisitos' : 'Méritos'}
                  </Badge>
                </Table.Td>
                <Table.Td ta="right">{document.startPage}</Table.Td>
                <Table.Td ta="right">{document.pageCount}</Table.Td>
                <Table.Td ta="right">{formatBytes(document.size)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Alert variant="light" color="gray">
        Al unir los justificantes, las firmas digitales que llevaran incrustadas dejan de poder
        verificarse; los códigos CSV impresos en sus páginas siguen sirviendo. Firma el expediente
        con AutoFirma al presentarlo en RedSara.
      </Alert>
    </Stack>
  );
}
