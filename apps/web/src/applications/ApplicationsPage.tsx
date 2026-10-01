import type { ApplicationDto } from '@docunex/shared';
import {
  Alert,
  Anchor,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { usePositions } from '../positions/api';
import { PositionFormModal } from '../positions/PositionFormModal';
import { formatIsoDate } from '../utils/format';
import { useApplications, useCreateApplication } from './api';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

export function ApplicationsPage() {
  const { data: applications, isPending, error } = useApplications();
  const [creating, setCreating] = useState(false);

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <Title order={2}>Solicitudes</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
          Nueva solicitud
        </Button>
      </Group>
      <Text c="dimmed">
        Cada solicitud es una plaza con su selección de documentos y méritos. Al generarla obtienes
        el PDF único para presentar en RedSara.
      </Text>
      {error && (
        <Alert color="red" title="No se pudieron cargar las solicitudes">
          {error.message}
        </Alert>
      )}
      {isPending ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : applications && applications.length > 0 ? (
        <Table.ScrollContainer minWidth={560}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Plaza</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Méritos</Table.Th>
                <Table.Th>Último expediente</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {applications.map((application) => (
                <ApplicationRow key={application.id} application={application} />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      ) : (
        <Text c="dimmed" py="lg">
          Todavía no has creado ninguna solicitud.
        </Text>
      )}
      <NewApplicationModal opened={creating} onClose={() => setCreating(false)} />
    </Stack>
  );
}

function ApplicationRow({ application }: { application: ApplicationDto }) {
  const pkg = application.latestPackage;
  return (
    <Table.Tr>
      <Table.Td>
        <Anchor component={Link} to={`/solicitudes/${application.id}`} fw={600}>
          {application.position.code}
        </Anchor>
        {application.position.title && (
          <Text size="xs" c="dimmed">
            {application.position.title}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <ApplicationStatusBadge status={application.status} />
        {application.registryEntries[0] && (
          <Text size="xs" c="dimmed" mt={2}>
            Nº {application.registryEntries[0].number}
          </Text>
        )}
        {application.hiring && (
          <Anchor
            component={Link}
            to={`/solicitudes/${application.id}/contratacion`}
            size="xs"
            c={application.hiring.complete ? 'green' : undefined}
          >
            Fase 2:{' '}
            {application.hiring.complete
              ? 'documentación completa'
              : `${application.hiring.requiredDone} de ${application.hiring.requiredTotal} documentos`}
          </Anchor>
        )}
      </Table.Td>
      <Table.Td>{formatIsoDate(application.applicationDate)}</Table.Td>
      <Table.Td>{application.meritIds.length}</Table.Td>
      <Table.Td>
        {pkg ? (
          <Text size="sm">
            v{pkg.version} ·{' '}
            {pkg.status === 'done'
              ? `${pkg.pageCount} páginas`
              : pkg.status === 'failed'
                ? 'con errores'
                : 'generándose'}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            Sin generar
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

function NewApplicationModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: positions = [] } = usePositions();
  const create = useCreateApplication();
  const [positionId, setPositionId] = useState<string | null>(null);
  const [addingPosition, setAddingPosition] = useState(false);

  const submit = () => {
    if (!positionId) return;
    create.mutate(positionId, {
      onSuccess: (application) => {
        onClose();
        void navigate(`/solicitudes/${application.id}`);
      },
      onError: (error) =>
        notifications.show({ color: 'red', title: 'No se pudo crear', message: error.message }),
    });
  };

  return (
    <>
      <Modal opened={opened && !addingPosition} onClose={onClose} title="Nueva solicitud">
        <Stack>
          <Select
            label="Plaza"
            placeholder={positions.length ? 'Elige la plaza' : 'Añade antes una plaza'}
            data={positions.map((position) => ({
              value: position.id,
              label: position.title ? `${position.code} · ${position.title}` : position.code,
            }))}
            value={positionId}
            onChange={setPositionId}
            searchable
          />
          <Anchor
            component="button"
            type="button"
            size="sm"
            onClick={() => setAddingPosition(true)}
          >
            Añadir una plaza nueva
          </Anchor>
          <Text size="sm" c="dimmed">
            Se seleccionan todos tus méritos; podrás quitar los que no quieras incluir.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!positionId} loading={create.isPending} onClick={submit}>
              Crear
            </Button>
          </Group>
        </Stack>
      </Modal>
      <PositionFormModal
        position={addingPosition ? null : undefined}
        onClose={() => setAddingPosition(false)}
        onSaved={(position) => setPositionId(position.id)}
      />
    </>
  );
}
