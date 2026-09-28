import type { ApplicationDto } from '@docunex/shared';
import { Alert, Button, Center, Group, Loader, Stack } from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import { useValidation } from '../api';
import { IssueList } from '../IssueList';
import { SizeBudget } from '../SizeBudget';

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

  return (
    <Stack>
      {data.errors.length === 0 && data.warnings.length === 0 && (
        <Alert color="green" variant="light" icon={<IconCircleCheck />} title="Todo listo">
          La solicitud cumple todas las comprobaciones.
        </Alert>
      )}
      <IssueList issues={data.errors} kind="error" title="Hay que corregir esto antes de generar" />
      <IssueList issues={data.warnings} kind="warning" title="Avisos" />
      <SizeBudget size={data.sizeEstimate} estimate documents={data.largestDocuments} />
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
