import { MAX_PACKAGE_BYTES } from '@docunex/shared';
import { Group, Progress, Stack, Table, Text } from '@mantine/core';
import { formatMegabytes } from '../utils/format';

/**
 * Presupuesto de tamaño frente al límite de RedSara por fichero, con los documentos que más pesan.
 * `size` es el estimado (antes de generar) o el real (del expediente).
 */
export function SizeBudget({
  size,
  estimate,
  documents,
}: {
  size: number;
  estimate: boolean;
  documents: { name: string; size: number; originalSize?: number | null }[];
}) {
  const ratio = size / MAX_PACKAGE_BYTES;
  const color = ratio > 1 ? 'red' : ratio > 0.8 ? 'yellow' : 'blue';
  return (
    <Stack gap={6}>
      <Group justify="space-between" gap="xs">
        <Text size="sm" fw={500}>
          {estimate ? 'Tamaño estimado' : 'Tamaño'}: {formatMegabytes(size)}
        </Text>
        <Text size="sm" c="dimmed">
          Límite de RedSara: {formatMegabytes(MAX_PACKAGE_BYTES)} por fichero
        </Text>
      </Group>
      <Progress
        value={Math.min(1, ratio) * 100}
        color={color}
        aria-label="Tamaño frente al límite"
      />
      {documents.length > 0 && (
        <Table.ScrollContainer minWidth={360}>
          <Table verticalSpacing={2} fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Documentos que más pesan</Table.Th>
                <Table.Th ta="right">Tamaño</Table.Th>
                <Table.Th ta="right">Del total</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {documents.map((document, index) => (
                <Table.Tr key={index}>
                  <Table.Td>{document.name}</Table.Td>
                  <Table.Td ta="right" style={{ whiteSpace: 'nowrap' }}>
                    {formatMegabytes(document.size)}
                    {document.originalSize != null && (
                      <Text span size="xs" c="dimmed">
                        {' '}
                        (antes {formatMegabytes(document.originalSize)})
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">
                    {size > 0 ? Math.round((document.size / size) * 100) : 0} %
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {estimate && ratio > 1 && (
        <Text size="xs" c="dimmed">
          Al generar, si pasa del límite, se recomprimirán las imágenes de los documentos más
          pesados (a unos 150 ppp y, si no basta, a unos 100 ppp).
        </Text>
      )}
    </Stack>
  );
}
