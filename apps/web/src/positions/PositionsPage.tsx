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
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconRefresh, IconTrash, IconWorldSearch } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { formatIsoDate } from '../utils/format';
import { useDeletePosition, usePositions, useSyncUexPositions } from './api';
import { PositionFormModal } from './PositionFormModal';
import { PositionStageBadge } from './PositionStageBadge';
import { UexPositionsModal } from './UexPositionsModal';

/** Al abrir la página se consulta de nuevo la web si el último estado tiene más de una hora. */
const STALE_STATUS_MS = 60 * 60 * 1000;

function isStale(position: PositionDto): boolean {
  return (
    position.uexStatus !== null &&
    Date.now() - new Date(position.uexStatus.syncedAt).getTime() > STALE_STATUS_MS
  );
}

export function PositionsPage() {
  const { data: positions, isPending, error } = usePositions();
  const [editing, setEditing] = useState<PositionDto | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<PositionDto | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const sync = useSyncUexPositions();
  const tracked = positions?.some((position) => position.uexStatus !== null) ?? false;

  const syncStatuses = (quiet: boolean) =>
    sync.mutate(undefined, {
      onSuccess: ({ updated }) => {
        if (!quiet) {
          notifications.show({
            color: 'green',
            message:
              updated === 1
                ? 'Estado de 1 plaza actualizado'
                : `Estado de ${updated} plazas actualizado`,
          });
        }
      },
      onError: (error) =>
        notifications.show({
          color: 'red',
          title: 'No se pudo consultar la web de la UEx',
          message: error.message,
        }),
    });

  // Las plazas cambian de fase en la web de la UEx: se refrescan solas una vez por visita.
  const autoSynced = useRef(false);
  useEffect(() => {
    if (!autoSynced.current && positions?.some(isStale)) {
      autoSynced.current = true;
      syncStatuses(true);
    }
  });

  return (
    <Stack maw={960}>
      <Group justify="space-between" align="flex-end">
        <Title order={2}>Plazas</Title>
        <Group gap="sm">
          {tracked && (
            <Tooltip label="Consulta en la web de la UEx en qué fase está cada plaza">
              <Button
                variant="default"
                leftSection={<IconRefresh size={16} />}
                loading={sync.isPending}
                onClick={() => syncStatuses(false)}
              >
                Actualizar estados
              </Button>
            </Tooltip>
          )}
          <Button
            variant="light"
            leftSection={<IconWorldSearch size={16} />}
            onClick={() => setBrowsing(true)}
          >
            Buscar en la UEx
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
            Nueva plaza
          </Button>
        </Group>
      </Group>
      <Text c="dimmed">
        Plazas PCI a las que te presentas. El código y la fecha de resolución van en el Anexo III.
        Con «Buscar en la UEx» puedes añadirlas desde la web de convocatorias de la universidad y
        seguir en qué fase están.
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
                <Table.Th>Estado</Table.Th>
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
                    {position.uexStatus ? (
                      <Tooltip
                        multiline
                        maw={320}
                        disabled={!position.uexStatus.observations}
                        label={position.uexStatus.observations}
                      >
                        <span>
                          <PositionStageBadge
                            stage={position.uexStatus.stage}
                            documents={position.uexStatus.documents}
                          />
                        </span>
                      </Tooltip>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {position.title ?? position.department}
                    {[position.title && position.department, position.area, position.center]
                      .filter(Boolean)
                      .map((detail) => (
                        <Text key={detail as string} size="xs" c="dimmed">
                          {detail}
                        </Text>
                      ))}
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
          Todavía no has añadido ninguna plaza. Búscalas en la web de la UEx o añádelas a mano.
        </Text>
      )}
      <PositionFormModal position={editing} onClose={() => setEditing(undefined)} />
      <UexPositionsModal opened={browsing} onClose={() => setBrowsing(false)} />
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
