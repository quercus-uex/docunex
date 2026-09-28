import type { ApplicationDto } from '@docunex/shared';
import {
  Alert,
  Anchor,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Stack,
  Stepper,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApplication, useDeleteApplication } from './api';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { GenerateStep } from './steps/GenerateStep';
import { MeritsStep } from './steps/MeritsStep';
import { PositionStep } from './steps/PositionStep';
import { RequirementsStep } from './steps/RequirementsStep';
import { ValidationStep } from './steps/ValidationStep';

const LAST_STEP = 4;

/** Asistente de una solicitud (`/solicitudes/:id`), pasos ①–⑤ del plan. */
export function ApplicationPage() {
  const { id = '' } = useParams();
  const { data: application, isPending, error } = useApplication(id);

  if (isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }
  if (error) {
    return (
      <Stack maw={960}>
        <BackLink />
        <Alert color="red" title="No se pudo cargar la solicitud">
          {error.message}
        </Alert>
      </Stack>
    );
  }
  return <Wizard application={application} />;
}

function BackLink() {
  return (
    <Anchor component={Link} to="/solicitudes" size="sm">
      <Group gap={4}>
        <IconArrowLeft size={14} />
        Solicitudes
      </Group>
    </Anchor>
  );
}

function Wizard({ application }: { application: ApplicationDto }) {
  // Si ya hay un expediente, se abre en el último paso.
  const [step, setStep] = useState(application.latestPackage ? LAST_STEP : 0);
  const [deleting, setDeleting] = useState(false);
  const next = () => setStep((s) => Math.min(LAST_STEP, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const props = { application, onNext: next, onBack: back };

  return (
    <Stack maw={1100}>
      <BackLink />
      <Group justify="space-between" align="flex-end">
        <Group gap="sm">
          <Title order={2}>Solicitud {application.position.code}</Title>
          <ApplicationStatusBadge status={application.status} />
        </Group>
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={() => setDeleting(true)}
        >
          Eliminar
        </Button>
      </Group>
      {application.position.title && <Text c="dimmed">{application.position.title}</Text>}

      <Stepper active={step} onStepClick={setStep} size="sm" allowNextStepsSelect>
        <Stepper.Step label="Plaza y textos">
          <PositionStep {...props} />
        </Stepper.Step>
        <Stepper.Step label="Requisitos" description="Bloque 5">
          <RequirementsStep {...props} />
        </Stepper.Step>
        <Stepper.Step label="Méritos" description={`${application.meritIds.length} seleccionados`}>
          <MeritsStep {...props} />
        </Stepper.Step>
        <Stepper.Step label="Validación">
          <ValidationStep {...props} />
        </Stepper.Step>
        <Stepper.Step label="Generar">
          <GenerateStep {...props} />
        </Stepper.Step>
      </Stepper>
      <DeleteApplicationModal
        application={application}
        opened={deleting}
        onClose={() => setDeleting(false)}
      />
    </Stack>
  );
}

function DeleteApplicationModal({
  application,
  opened,
  onClose,
}: {
  application: ApplicationDto;
  opened: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const remove = useDeleteApplication();
  return (
    <Modal opened={opened} onClose={onClose} title="Eliminar solicitud">
      <Stack>
        <Text>
          ¿Seguro que quieres eliminar la solicitud de la plaza {application.position.code}? Se
          borrarán también sus expedientes generados. Tus méritos y documentos no se tocan.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="red"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(application.id, {
                onSuccess: () => {
                  notifications.show({ color: 'green', message: 'Solicitud eliminada' });
                  void navigate('/solicitudes');
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
