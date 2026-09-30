import {
  departmentKey,
  POSITION_STAGE_LABELS,
  POSITION_STAGES,
  type PositionStage,
  sameDepartment,
  type UexPositionDto,
} from '@docunex/shared';
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Center,
  Checkbox,
  Grid,
  Group,
  Loader,
  Modal,
  MultiSelect,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconRefresh, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useProfile } from '../profile/api';
import { formatIsoDate } from '../utils/format';
import { useImportUexPositions, useRefreshUexPositions, useUexPositions } from './api';
import { PositionStageBadge } from './PositionStageBadge';

type StageFilter = 'all' | PositionStage;

/** Busca las plazas publicadas en la web de la UEx y añade las elegidas. */
export function UexPositionsModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const mobile = useMediaQuery('(max-width: 48em)');
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Plazas PCI publicadas por la UEx"
      size={1100}
      fullScreen={mobile}
    >
      {opened && <UexPositionsBrowser onDone={onClose} />}
    </Modal>
  );
}

/** Departamentos distintos de la lista (agrupando variantes de escritura), por orden alfabético. */
function departmentOptions(positions: UexPositionDto[]) {
  const byKey = new Map<string, string>();
  for (const { department } of positions) {
    if (department && !byKey.has(departmentKey(department))) {
      byKey.set(departmentKey(department), department);
    }
  }
  return [...byKey]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

function UexPositionsBrowser({ onDone }: { onDone: () => void }) {
  const listing = useUexPositions(true);
  const refresh = useRefreshUexPositions();
  const importPositions = useImportUexPositions();
  const { data: profile } = useProfile();
  // `null` hasta que el usuario toca el filtro: se usa el departamento del perfil.
  const [departments, setDepartments] = useState<string[] | null>(null);
  const [stage, setStage] = useState<StageFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  if (listing.isPending) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <Loader />
          <Text c="dimmed" size="sm">
            Consultando la web de la UEx…
          </Text>
        </Stack>
      </Center>
    );
  }
  if (listing.error) {
    return (
      <Stack>
        <Alert color="red" title="No se pudo consultar la web de la UEx">
          {listing.error.message}. Puedes volver a intentarlo más tarde o añadir la plaza a mano.
        </Alert>
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Cerrar
          </Button>
          <Button
            leftSection={<IconRefresh size={16} />}
            loading={listing.isFetching}
            onClick={() => void listing.refetch()}
          >
            Reintentar
          </Button>
        </Group>
      </Stack>
    );
  }

  const { positions, source, fetchedAt } = listing.data;
  const options = departmentOptions(positions);
  const profileDepartments = options
    .filter((option) => sameDepartment(option.label, profile?.department ?? null))
    .map((option) => option.value);
  const activeDepartments = departments ?? profileDepartments;

  const query = search.trim().toLowerCase();
  const visible = positions.filter(
    (position) =>
      (activeDepartments.length === 0 ||
        (position.department !== null &&
          activeDepartments.includes(departmentKey(position.department)))) &&
      (stage === 'all' || position.stage === stage) &&
      (query === '' ||
        [position.code, position.department, position.center, position.observations].some((text) =>
          text?.toLowerCase().includes(query),
        )),
  );
  const selectable = visible.filter((position) => position.positionId === null);
  const allSelected =
    selectable.length > 0 && selectable.every((position) => selected.includes(position.code));

  const toggle = (code: string, checked: boolean) =>
    setSelected((current) =>
      checked ? [...current, code] : current.filter((selectedCode) => selectedCode !== code),
    );

  const submit = () =>
    importPositions.mutate(
      { codes: selected },
      {
        onSuccess: (created) => {
          notifications.show({
            color: 'green',
            message:
              created.length === 1
                ? `Plaza ${created[0]!.code} añadida`
                : `${created.length} plazas añadidas`,
          });
          onDone();
        },
        onError: (error) =>
          notifications.show({ color: 'red', title: 'No se pudo añadir', message: error.message }),
      },
    );

  return (
    <Stack>
      <Grid align="flex-end">
        <Grid.Col span={{ base: 12, sm: 8 }}>
          <MultiSelect
            label="Departamento"
            placeholder={activeDepartments.length === 0 ? 'Todos los departamentos' : undefined}
            data={options}
            value={activeDepartments}
            onChange={setDepartments}
            searchable
            clearable
            nothingFoundMessage="Ningún departamento coincide"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <TextInput
            label="Buscar"
            placeholder="Código, centro…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </Grid.Col>
      </Grid>
      <Group justify="space-between" wrap="wrap">
        <SegmentedControl
          value={stage}
          onChange={(value) => setStage(value as StageFilter)}
          data={[
            { value: 'all', label: 'Todas' },
            ...POSITION_STAGES.map((value) => ({ value, label: POSITION_STAGE_LABELS[value] })),
          ]}
        />
        <Text size="sm" c="dimmed">
          {visible.length} de {positions.length} plazas
        </Text>
      </Group>
      {!profile?.department && (
        <Text size="sm" c="dimmed">
          Indica tu departamento en el{' '}
          <Anchor component={Link} to="/perfil" onClick={onDone}>
            perfil
          </Anchor>{' '}
          para ver directamente sus plazas.
        </Text>
      )}

      <Table.ScrollContainer minWidth={760} mah="55vh">
        <Table highlightOnHover verticalSpacing="sm" stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}>
                <Checkbox
                  aria-label="Seleccionar todas"
                  checked={allSelected}
                  indeterminate={
                    !allSelected && selectable.some(({ code }) => selected.includes(code))
                  }
                  disabled={selectable.length === 0}
                  onChange={(event) =>
                    setSelected((current) => {
                      const codes = selectable.map(({ code }) => code);
                      const others = current.filter((code) => !codes.includes(code));
                      return event.currentTarget.checked ? [...others, ...codes] : others;
                    })
                  }
                />
              </Table.Th>
              <Table.Th>Plaza</Table.Th>
              <Table.Th>Departamento y centro</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Observaciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visible.map((position) => (
              <Table.Tr key={position.code}>
                <Table.Td>
                  {position.positionId ? (
                    <Tooltip label="Ya está en tus plazas">
                      <IconCheck size={18} color="var(--mantine-color-green-6)" />
                    </Tooltip>
                  ) : (
                    <Checkbox
                      aria-label={`Seleccionar ${position.code}`}
                      checked={selected.includes(position.code)}
                      onChange={(event) => toggle(position.code, event.currentTarget.checked)}
                    />
                  )}
                </Table.Td>
                <Table.Td fw={600}>
                  {position.code}
                  {position.positionId && (
                    <Badge ml="xs" size="xs" color="gray" variant="light">
                      Añadida
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  {position.department ?? <Text c="dimmed">—</Text>}
                  {position.center && (
                    <Text size="xs" c="dimmed">
                      {position.center}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <PositionStageBadge stage={position.stage} documents={position.documents} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{position.observations}</Text>
                  {position.deadline && (
                    <Text size="xs" c="dimmed">
                      Plazo de solicitudes hasta el {formatIsoDate(position.deadline)}
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {visible.length === 0 && (
          <Text c="dimmed" ta="center" py="lg">
            No hay plazas con estos filtros.
          </Text>
        )}
      </Table.ScrollContainer>

      <Group justify="space-between" wrap="wrap">
        <Group gap={4}>
          <Text size="xs" c="dimmed">
            Fuente:{' '}
            <Anchor href={source} target="_blank" rel="noreferrer" size="xs">
              {new URL(source).host}
            </Anchor>{' '}
            · consultada el {formatDateTime(fetchedAt)}
          </Text>
          <Tooltip label="Volver a consultar la web">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label="Volver a consultar la web"
              loading={refresh.isPending}
              onClick={() =>
                refresh.mutate(undefined, {
                  onError: (error) =>
                    notifications.show({
                      color: 'red',
                      title: 'No se pudo consultar la web de la UEx',
                      message: error.message,
                    }),
                })
              }
            >
              <IconRefresh size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Group>
          <Button variant="default" onClick={onDone}>
            Cancelar
          </Button>
          <Button
            disabled={selected.length === 0}
            loading={importPositions.isPending}
            onClick={submit}
          >
            {selected.length === 0
              ? 'Añadir plazas'
              : selected.length === 1
                ? 'Añadir 1 plaza'
                : `Añadir ${selected.length} plazas`}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
