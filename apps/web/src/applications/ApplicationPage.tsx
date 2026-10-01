import { type ApplicationDto, isApplicationLocked } from '@docunex/shared';
import {
  Alert,
  Anchor,
  Button,
  Center,
  Group,
  Loader,
  type MantineSize,
  Modal,
  Stack,
  Stepper,
  Text,
  Title,
  useMatches,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconLock, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApplication, useDeleteApplication } from './api';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { GenerateStep } from './steps/GenerateStep';
import { HiringStep } from './steps/HiringStep';
import { MeritsStep } from './steps/MeritsStep';
import { PositionStep } from './steps/PositionStep';
import { RegistryStep } from './steps/RegistryStep';
import { RequirementsStep } from './steps/RequirementsStep';
import { ValidationStep } from './steps/ValidationStep';

const GENERATE_STEP = 4;
const REGISTRY_STEP = 5;
const HIRING_STEP = 6;

type InitialStep = 'registry' | 'hiring';

/**
 * Asistente de una solicitud (`/solicitudes/:id`), pasos ①–⑥ del plan y ⑦, la segunda fase
 * (contratación). Con `open` se abre en la guía de registro (`/solicitudes/:id/registro`) o en la
 * segunda fase (`/solicitudes/:id/contratacion`).
 */
export function ApplicationPage({ open }: { open?: InitialStep }) {
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
      <Stack>
        <BackLink />
        <Alert color="red" title="No se pudo cargar la solicitud">
          {error.message}
        </Alert>
      </Stack>
    );
  }
  return <Wizard application={application} open={open} />;
}

function BackLink() {
  return (
    <Anchor component={Link} to="/solicitudes" size="sm">
      <Group gap={4}>
        <IconArrowLeft size={18} />
        Solicitudes
      </Group>
    </Anchor>
  );
}

function initialStep(application: ApplicationDto, open: InitialStep | undefined): number {
  if (open === 'hiring') return HIRING_STEP;
  if (open === 'registry' || isApplicationLocked(application.status)) return REGISTRY_STEP;
  // Si ya hay un expediente, se abre en la generación.
  return application.latestPackage ? GENERATE_STEP : 0;
}

function Wizard({ application, open }: { application: ApplicationDto; open?: InitialStep }) {
  const [step, setStep] = useState(() => initialStep(application, open));
  const [deleting, setDeleting] = useState(false);
  const locked = isApplicationLocked(application.status);
  const next = () => setStep((s) => Math.min(HIRING_STEP, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const props = { application, locked, onNext: next, onBack: back };
  // Los seis pasos en horizontal no caben en pantallas estrechas: ahí se apilan en vertical, y en
  // las intermedias se compactan un poco para que quepan en una sola fila.
  const orientation = useMatches<'horizontal' | 'vertical'>({ base: 'vertical', lg: 'horizontal' });
  const stepperSize = useMatches<MantineSize>({ base: 'md', lg: 'sm', xl: 'md' });

  return (
    <Stack>
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
      {locked && (
        <Alert color="gray" variant="light" icon={<IconLock />}>
          Solicitud {application.status === 'closed' ? 'cerrada' : 'registrada'} con el nº{' '}
          {application.registryEntries[0]?.number}: se puede consultar, pero ya no se modifica. El
          expediente presentado queda guardado tal cual.
          {application.status === 'registered' &&
            ' La documentación de la segunda fase (contratación) sí se puede preparar en el último paso.'}
        </Alert>
      )}

      <Stepper
        active={step}
        onStepClick={setStep}
        orientation={orientation}
        size={stepperSize}
        allowNextStepsSelect
      >
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
        <Stepper.Step label="Registro" description="RedSara">
          <RegistryStep {...props} />
        </Stepper.Step>
        <Stepper.Step
          label="Contratación"
          description={
            application.hiring
              ? `Fase 2 · ${application.hiring.requiredDone}/${application.hiring.requiredTotal}`
              : 'Fase 2'
          }
        >
          <HiringStep {...props} />
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
        {isApplicationLocked(application.status) && (
          <Alert color="red" variant="light">
            Está registrada: perderás el expediente que presentaste y su nº de registro.
          </Alert>
        )}
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
