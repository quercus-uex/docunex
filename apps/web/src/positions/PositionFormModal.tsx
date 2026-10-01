import { type PositionDto, type PositionInput, positionInputSchema } from '@docunex/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Modal, SimpleGrid, Stack, Textarea, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '../api/client';
import { applyServerErrors } from '../api/validation';
import { useSavePosition } from './api';

const EMPTY: PositionInput = {
  code: '',
  resolutionDate: null,
  title: '',
  area: '',
  department: '',
  center: '',
  deadline: null,
  notes: '',
};

function toFormValues(position: PositionDto | null): PositionInput {
  if (!position) return EMPTY;
  return {
    code: position.code,
    resolutionDate: position.resolutionDate,
    title: position.title ?? '',
    area: position.area ?? '',
    department: position.department ?? '',
    center: position.center ?? '',
    deadline: position.deadline,
    notes: position.notes ?? '',
  };
}

/** Alta o edición de una plaza. `position === undefined` cierra el modal; `null` es una plaza nueva. */
export function PositionFormModal({
  position,
  onClose,
  onSaved,
}: {
  position: PositionDto | null | undefined;
  onClose: () => void;
  onSaved?: (position: PositionDto) => void;
}) {
  return (
    <Modal
      opened={position !== undefined}
      onClose={onClose}
      title={position ? `Plaza ${position.code}` : 'Nueva plaza'}
      size="lg"
    >
      {position !== undefined && (
        <PositionForm
          key={position?.id ?? 'new'}
          position={position}
          onDone={(saved) => {
            onSaved?.(saved);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

function PositionForm({
  position,
  onDone,
}: {
  position: PositionDto | null;
  onDone: (position: PositionDto) => void;
}) {
  const save = useSavePosition();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(positionInputSchema),
    defaultValues: toFormValues(position),
  });

  const submit = handleSubmit((input) =>
    save.mutate(
      { id: position?.id, input },
      {
        onSuccess: (saved) => {
          notifications.show({ color: 'green', message: `Plaza ${saved.code} guardada` });
          onDone(saved);
        },
        onError: (error) => {
          // El 409 de código repetido trae `issues` como un 400.
          const handled =
            error instanceof ApiError && error.status === 409
              ? applyServerErrors(new ApiError(400, error.message, error.body), setError)
              : applyServerErrors(error, setError);
          if (!handled) {
            notifications.show({
              color: 'red',
              title: 'No se pudo guardar',
              message: error.message,
            });
          }
        },
      },
    ),
  );

  const dateField = (name: 'resolutionDate' | 'deadline', label: string, description?: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <DateInput
          label={label}
          description={description}
          valueFormat="DD/MM/YYYY"
          clearable
          value={field.value ?? null}
          onChange={field.onChange}
          error={errors[name]?.message}
        />
      )}
    />
  );

  return (
    <form onSubmit={submit} noValidate>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Código de la plaza"
            description="Identificador de la convocatoria: IN y 6 dígitos"
            placeholder="IN123456"
            required
            error={errors.code?.message}
            {...register('code')}
          />
          {dateField('resolutionDate', 'Fecha de resolución', 'La del Anexo III')}
          <TextInput label="Denominación" error={errors.title?.message} {...register('title')} />
          <TextInput label="Área" error={errors.area?.message} {...register('area')} />
          <TextInput
            label="Departamento"
            error={errors.department?.message}
            {...register('department')}
          />
          <TextInput label="Centro" error={errors.center?.message} {...register('center')} />
          {dateField('deadline', 'Fin del plazo')}
        </SimpleGrid>
        <Textarea
          label="Notas"
          autosize
          minRows={2}
          error={errors.notes?.message}
          {...register('notes')}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={save.isPending}>
            Guardar
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
