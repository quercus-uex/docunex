import type { PositionDto } from '@docunex/shared';
import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatIsoDate } from '../utils/format';
import { useDeletePosition, usePositions } from './api';
import { PositionFormModal } from './PositionFormModal';

export function PositionsPage() {
  const { data: positions, isPending, error } = usePositions();
  const [editing, setEditing] = useState<PositionDto | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<PositionDto | null>(null);

  return (
    <Stack maw={960}>
      <Group justify="space-between" align="flex-end">
        <Title order={2}>Plazas</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
          Nueva plaza
        </Button>
      </Group>
      <Text c="dimmed">
        Plazas PCI a las que te presentas. El código y la fecha de resolución van en el Anexo III.
      </Text>
      {error && (
        <Alert color="red" title="No se pudieron cargar las plazas">
          {error.message}
        </Alert>
      )}
      {isPending ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : positions && positions.length > 0 ? (
        <Table.ScrollContainer minWidth={640}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Código</Table.Th>
                <Table.Th>Denominación</Table.Th>
                <Table.Th>Resolución</Table.Th>
                <Table.Th>Fin del plazo</Table.Th>
                <Table.Th>Solicitudes</Table.Th>
                <Table.Th w={80} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {positions.map((position) => (
                <Table.Tr key={position.id}>
                  <Table.Td fw={600}>{position.code}</Table.Td>
                  <Table.Td>
                    {position.title}
                    {position.area && (
                      <Text size="xs" c="dimmed">
                        {position.area}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {position.resolutionDate ? (
                      formatIsoDate(position.resolutionDate)
                    ) : (
                      <Text size="sm" c="red">
                        Falta
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>{formatIsoDate(position.deadline)}</Table.Td>
                  <Table.Td>
                    {position.applications > 0 ? (
                      <Anchor component={Link} to="/solicitudes" size="sm">
                        {position.applications}
                      </Anchor>
                    ) : (
                      '—'
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap={2} wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="Editar"
                        onClick={() => setEditing(position)}
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Eliminar"
                        onClick={() => setDeleting(position)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      ) : (
        <Text c="dimmed" py="lg">
          Todavía no has añadido ninguna plaza.
        </Text>
      )}
      <PositionFormModal position={editing} onClose={() => setEditing(undefined)} />
      <DeletePositionModal position={deleting} onClose={() => setDeleting(null)} />
    </Stack>
  );
}

function DeletePositionModal({
  position,
  onClose,
}: {
  position: PositionDto | null;
  onClose: () => void;
}) {
  const remove = useDeletePosition();
  const inUse = (position?.applications ?? 0) > 0;
  return (
    <Modal opened={position !== null} onClose={onClose} title="Eliminar plaza">
      <Stack>
        {inUse ? (
          <Alert color="yellow" variant="light">
            La plaza {position?.code} tiene solicitudes. Elimínalas antes de eliminar la plaza.
          </Alert>
        ) : (
          <Text>¿Seguro que quieres eliminar la plaza {position?.code}?</Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="red"
            disabled={inUse}
            loading={remove.isPending}
            onClick={() =>
              position &&
              remove.mutate(position.id, {
                onSuccess: () => {
                  notifications.show({
                    color: 'green',
                    message: `Plaza ${position.code} eliminada`,
                  });
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
