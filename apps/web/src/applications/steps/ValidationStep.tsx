import { type ApplicationDto, MAX_PACKAGE_BYTES } from '@docunex/shared';
import { Alert, Button, Center, Group, Loader, Progress, Stack, Text } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import { useValidation } from '../api';
import { IssueList } from '../IssueList';

/** En MB decimales, como el límite de RedSara (10 MB). */
function megabytes(bytes: number): string {
  return `${(bytes / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
}

/** ④ Comprobaciones antes de generar y tamaño estimado. */
export function ValidationStep({
  application,
  onBack,
  onNext,
}: {
  application: ApplicationDto;
  onBack: () => void;
  onNext: () => void;
}) {
  const { data, isPending, error, refetch, isFetching } = useValidation(application.id);

  if (isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }
  if (error) {
    return (
      <Alert color="red" title="No se pudo validar">
        {error.message}
      </Alert>
    );
  }

  const ratio = Math.min(1, data.sizeEstimate / MAX_PACKAGE_BYTES);
  return (
    <Stack>
      {data.errors.length === 0 && data.warnings.length === 0 && (
        <Alert color="green" variant="light" icon={<IconCircleCheck />} title="Todo listo">
          La solicitud cumple todas las comprobaciones.
        </Alert>
      )}
      <IssueList issues={data.errors} kind="error" title="Hay que corregir esto antes de generar" />
      <IssueList issues={data.warnings} kind="warning" title="Avisos" />
      <Stack gap={4}>
        <Text size="sm">
          Tamaño estimado: {megabytes(data.sizeEstimate)} de los {megabytes(MAX_PACKAGE_BYTES)} que
          admite RedSara por fichero.
        </Text>
        <Progress
          value={ratio * 100}
          color={ratio >= 1 ? 'red' : ratio > 0.8 ? 'yellow' : 'blue'}
        />
      </Stack>
      <Group justify="flex-end">
        <Button variant="subtle" loading={isFetching} onClick={() => void refetch()}>
          Volver a comprobar
        </Button>
        <Button variant="default" onClick={onBack}>
          Anterior
        </Button>
        <Button onClick={onNext} disabled={data.errors.length > 0}>
          Siguiente
        </Button>
      </Group>
    </Stack>
  );
}
